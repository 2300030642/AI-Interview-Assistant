# Hugging Face/Sentence Transformers are imported lazily only when explicitly enabled.
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_core.prompts import PromptTemplate

from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np
import json
import os


# =========================================================
# EMBEDDING CONFIGURATION
# =========================================================
# Render's free instance has limited RAM. Sentence Transformers
# can load PyTorch and exceed the memory limit at startup.
#
# Local development can still use Hugging Face embeddings by
# setting:
#     USE_HF_EMBEDDINGS=true
#
# Deployment defaults to a lightweight TF-IDF + FAISS index.
USE_HF_EMBEDDINGS = os.getenv("USE_HF_EMBEDDINGS", "false").lower() == "true"

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

_embeddings = None


def get_embeddings():
    """Load Hugging Face embeddings only when explicitly enabled."""
    global _embeddings

    if _embeddings is None:
        from langchain_huggingface import HuggingFaceEmbeddings

        _embeddings = HuggingFaceEmbeddings(
            model_name=MODEL_NAME,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )

    return _embeddings


# =========================================================
# LIGHTWEIGHT FAISS VECTOR STORE
# =========================================================

class LightweightFAISSStore:
    """
    Memory-friendly vector store for Render's free instance.

    It uses TF-IDF vectors for retrieval and stores them in a
    FAISS IndexFlatIP index. This keeps the RAG + FAISS flow
    without loading PyTorch/Sentence Transformers.
    """

    def __init__(self, documents):
        if not documents:
            raise ValueError("Documents cannot be empty")

        self.documents = documents

        texts = [doc.page_content for doc in documents]

        self.vectorizer = TfidfVectorizer(
            lowercase=True,
            stop_words="english",
            ngram_range=(1, 2),
            max_features=5000,
        )

        matrix = self.vectorizer.fit_transform(texts).astype(np.float32)

        # Import FAISS only when this lightweight store is used.
        import faiss

        dense_matrix = matrix.toarray()

        # Normalize for cosine-similarity-like inner product.
        norms = np.linalg.norm(dense_matrix, axis=1, keepdims=True)
        dense_matrix = dense_matrix / np.maximum(norms, 1e-12)

        self.index = faiss.IndexFlatIP(dense_matrix.shape[1])
        self.index.add(dense_matrix)

    def similarity_search(self, question, k=4):
        if not question or not question.strip():
            return []

        query_matrix = self.vectorizer.transform(
            [question]
        ).astype(np.float32)

        query_vector = query_matrix.toarray()

        norm = np.linalg.norm(query_vector, axis=1, keepdims=True)
        query_vector = query_vector / np.maximum(norm, 1e-12)

        k = min(k, len(self.documents))

        _, indices = self.index.search(query_vector, k)

        return [
            self.documents[i]
            for i in indices[0]
            if i >= 0
        ]


# =========================================================
# TEXT SPLITTING
# =========================================================

def split_text(text: str):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
        separators=[
            "\n\n",
            "\n",
            ". ",
            " ",
            ""
        ]
    )

    return splitter.create_documents([text])


# =========================================================
# CREATE VECTOR STORE
# =========================================================

def create_vector_store(text: str):
    if not text or not text.strip():
        raise ValueError("Knowledge base text cannot be empty")

    documents = split_text(text)

    # Local option: original Hugging Face + LangChain FAISS.
    if USE_HF_EMBEDDINGS:
        return FAISS.from_documents(
            documents,
            get_embeddings()
        )

    # Deployment-safe option.
    return LightweightFAISSStore(documents)


# =========================================================
# SEARCH RELEVANT DOCUMENTS
# =========================================================

def search_relevant_context(
    vector_store,
    question: str,
    k: int = 4
):
    return vector_store.similarity_search(
        question,
        k=k
    )


# =========================================================
# CONVERT DOCUMENTS TO TEXT
# =========================================================

def get_context_text(documents):
    return "\n\n".join(
        document.page_content
        for document in documents
    )


# =========================================================
# BUILD KNOWLEDGE BASE
# =========================================================

def build_knowledge_base(
    resume_text: str,
    job_description_text: str,
    preparation: dict
):
    preparation_text = json.dumps(
        preparation,
        indent=2
    )

    combined_text = f"""
================ RESUME ================

{resume_text}

================ JOB DESCRIPTION ================

{job_description_text}

================ PERSONALIZED PREPARATION ================

{preparation_text}
"""

    return combined_text


# =========================================================
# RAG + LANGCHAIN + GEMINI
# =========================================================

def generate_rag_answer(
    question: str,
    resume_text: str,
    job_description_text: str,
    preparation: dict,
    gemini_client
):
    knowledge_base = build_knowledge_base(
        resume_text,
        job_description_text,
        preparation
    )

    vector_store = create_vector_store(
        knowledge_base
    )

    documents = search_relevant_context(
        vector_store,
        question,
        k=4
    )

    context = get_context_text(documents)

    template = """
You are an AI Interview Preparation Assistant.

Answer the student's question using ONLY the
retrieved context below.

RETRIEVED CONTEXT:

{context}

QUESTION:

{question}

Instructions:

1. Answer clearly and directly.
2. Explain in simple English.
3. Give practical interview examples when useful.
4. Connect the answer to the student's target role.
5. Never invent resume information.
6. If information is missing, honestly mention it.
7. Focus on interview preparation only.
"""

    prompt_template = PromptTemplate(
        input_variables=["context", "question"],
        template=template
    )

    final_prompt = prompt_template.format(
        context=context,
        question=question
    )

    response = gemini_client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=final_prompt
    )

    return response.text
