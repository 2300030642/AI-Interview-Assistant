from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import PromptTemplate
import json


MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


# =========================================================
# HUGGING FACE EMBEDDING MODEL
# =========================================================

embeddings = HuggingFaceEmbeddings(
    model_name=MODEL_NAME
)


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
# CREATE FAISS VECTOR STORE
# =========================================================

def create_vector_store(text: str):
    if not text or not text.strip():
        raise ValueError("Knowledge base text cannot be empty")

    documents = split_text(text)

    vector_store = FAISS.from_documents(
        documents,
        embeddings
    )

    return vector_store


# =========================================================
# SEARCH RELEVANT DOCUMENTS
# =========================================================

def search_relevant_context(
    vector_store,
    question: str,
    k: int = 4
):
    documents = vector_store.similarity_search(
        question,
        k=k
    )

    return documents


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
    # -------------------------------------
    # Build complete knowledge base
    # -------------------------------------

    knowledge_base = build_knowledge_base(
        resume_text,
        job_description_text,
        preparation
    )

    # -------------------------------------
    # Create FAISS vector database
    # -------------------------------------

    vector_store = create_vector_store(
        knowledge_base
    )

    # -------------------------------------
    # Retrieve relevant chunks
    # -------------------------------------

    documents = search_relevant_context(
        vector_store,
        question,
        k=4
    )

    context = get_context_text(documents)

    # -------------------------------------
    # LangChain Prompt Template
    # -------------------------------------

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

Return a natural helpful answer.
"""

    prompt = PromptTemplate(
        template=template,
        input_variables=[
            "context",
            "question"
        ]
    )

    formatted_prompt = prompt.format(
        context=context,
        question=question
    )

    # -------------------------------------
    # Gemini Generation
    # -------------------------------------

    response = gemini_client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=formatted_prompt
    )

    return {
        "answer": response.text.strip(),
        "retrieved_context": context,
        "chunks_found": len(documents)
    }
