from google import genai
from dotenv import load_dotenv
from pathlib import Path
import os
import json

from services.rag_service import (
    build_knowledge_base,
    create_vector_store,
    search_relevant_context,
    get_context_text
)


# -----------------------------------------
# Load environment
# -----------------------------------------

BASE_DIR = Path(__file__).resolve().parents[2]

load_dotenv(BASE_DIR / ".env")

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError(
        "GEMINI_API_KEY is not configured in .env"
    )

client = genai.Client(api_key=api_key)


# =========================================================
# Helper: Remove Markdown JSON Formatting
# =========================================================

def clean_json_response(text):

    text = text.strip()

    if text.startswith("```json"):
        text = text[7:]

    elif text.startswith("```"):
        text = text[3:]

    if text.endswith("```"):
        text = text[:-3]

    return text.strip()


# =========================================================
# Helper: Clean Evaluation Strengths
# =========================================================

def clean_strengths(strengths):
    """
    Keep only genuine positive observations.

    Gemini sometimes returns fallback/negative statements
    such as "None apparent..." inside the strengths array.
    Those statements belong in improvements or should be
    omitted completely.
    """

    if not isinstance(strengths, list):
        if isinstance(strengths, str) and strengths.strip():
            strengths = [strengths]
        else:
            return []

    negative_patterns = (
        "none apparent",
        "none evident",
        "none identified",
        "no strengths",
        "no clear strength",
        "no apparent strength",
        "not apparent",
        "not provided",
        "not demonstrated",
        "not enough",
        "not sufficient",
        "insufficient",
        "did not provide",
        "does not provide",
        "could not identify",
        "unable to identify",
        "no evidence",
        "no clear evidence",
        "lacks",
        "lack of",
        "missing",
        "poor",
        "weak",
        "needs improvement",
        "needs to improve",
    )

    cleaned = []

    for item in strengths:
        if not isinstance(item, str):
            continue

        item = item.strip()

        if not item:
            continue

        lowered = item.lower()

        if any(pattern in lowered for pattern in negative_patterns):
            continue

        cleaned.append(item)

    return cleaned


# =========================================================
# Helper: Normalize Evaluation Response
# =========================================================

def normalize_evaluation(result):
    """
    Make the evaluation response safe for the frontend
    and ensure strengths never contain negative/fallback
    statements.
    """

    if not isinstance(result, dict):
        raise ValueError("Invalid evaluation response from Gemini")

    try:
        score = float(result.get("score", 0))
    except (TypeError, ValueError):
        score = 0

    score = max(0, min(10, score))

    strengths = clean_strengths(result.get("strengths", []))

    improvements = result.get("improvements", [])

    if not isinstance(improvements, list):
        if isinstance(improvements, str) and improvements.strip():
            improvements = [improvements]
        else:
            improvements = []

    improvements = [
        item.strip()
        for item in improvements
        if isinstance(item, str) and item.strip()
    ]

    return {
        "score": score,
        "feedback": str(result.get("feedback", "")).strip(),
        "strengths": strengths,
        "improvements": improvements
    }


# =========================================================
# Helper: Create RAG Context
# =========================================================

def get_rag_context(
    question,
    preparation,
    resume_text="",
    job_description_text=""
):

    # If resume and JD are available, use complete
    # Resume + JD + Preparation knowledge base.

    if resume_text.strip() or job_description_text.strip():

        knowledge_base = build_knowledge_base(
            resume_text=resume_text,
            job_description_text=job_description_text,
            preparation=preparation
        )

    else:

        # Backward-compatible fallback.
        # This prevents the existing application
        # from breaking if only preparation is supplied.

        knowledge_base = json.dumps(
            preparation,
            indent=2
        )

    vector_store = create_vector_store(
        knowledge_base
    )

    documents = search_relevant_context(
        vector_store,
        question,
        k=4
    )

    return get_context_text(documents)


# =========================================================
# Start Mock Interview
# =========================================================

def start_mock_interview(
    preparation,
    resume_text="",
    job_description_text=""
):

    question_for_retrieval = """
Generate an interview question for the candidate's
target role based on their resume, job description,
skills, projects and preparation topics.
"""

    context = get_rag_context(
        question=question_for_retrieval,
        preparation=preparation,
        resume_text=resume_text,
        job_description_text=job_description_text
    )

    prompt = f"""
You are a professional AI interviewer.

You are conducting a realistic interview for the
candidate's target role.

Use the retrieved candidate information below.

RETRIEVED CANDIDATE INFORMATION:

{context}

PERSONALIZED PREPARATION:

{json.dumps(preparation, indent=2)}

Create the FIRST interview question.

Rules:

1. Ask exactly ONE question.
2. Make it realistic for the target role.
3. Use the candidate's actual skills, projects,
   experience or the job requirements when relevant.
4. Prefer personalized questions over generic questions.
5. Start naturally like a real interviewer.
6. Do not give the answer.
7. Do not give feedback yet.

Return ONLY JSON:

{{
    "question": ""
}}
"""

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt
    )

    text = clean_json_response(
        response.text
    )

    return json.loads(text)


# =========================================================
# Evaluate Answer
# =========================================================

def evaluate_answer(
    question,
    answer,
    preparation,
    resume_text="",
    job_description_text=""
):

    retrieval_question = f"""
Evaluate this candidate's interview answer.

Interview Question:
{question}

Candidate Answer:
{answer}

Retrieve information relevant to the candidate's
target role, skills, projects and job requirements.
"""

    context = get_rag_context(
        question=retrieval_question,
        preparation=preparation,
        resume_text=resume_text,
        job_description_text=job_description_text
    )

    prompt = f"""
You are an expert AI interview evaluator.

Evaluate the candidate's answer for the target role.

RELEVANT CANDIDATE AND ROLE INFORMATION:

{context}

TARGET ROLE AND PREPARATION:

{json.dumps(preparation, indent=2)}

INTERVIEW QUESTION:

{question}

CANDIDATE ANSWER:

{answer}

Evaluate the candidate's answer considering:

- Relevance
- Clarity
- Confidence
- Structure
- Technical/domain understanding
- Communication
- Practical thinking
- Role suitability
- Completeness
- Alignment with the job requirements

Give constructive and specific feedback.

IMPORTANT RULES FOR "strengths":

1. "strengths" MUST contain ONLY things the candidate
   actually did well in THIS answer.
2. Every strength must be a positive observation.
3. NEVER put negative statements, missing information,
   weaknesses, or improvement advice in "strengths".
4. NEVER write phrases such as:
   "None apparent", "None identified", "No evidence",
   "Insufficient", "Did not provide", "Missing",
   "Needs improvement", or similar negative/fallback text
   inside "strengths".
5. If the answer has no genuine strengths, return:
   "strengths": []
6. Do not invent strengths.

IMPORTANT RULES FOR "improvements":

1. Put weaknesses and missing points only in "improvements".
2. Be specific and constructive.
3. Do not repeat the same point in both arrays.

Other rules:

1. Do not invent experience that is not present.
2. Do not penalize the candidate for skills that
   are not required by the role.
3. Explain what the candidate did well.
4. Explain exactly what could be improved.
5. Give a score from 0 to 10.

Return ONLY JSON:

{{
    "score": 0,
    "feedback": "",
    "strengths": [],
    "improvements": []
}}
"""

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt
    )

    text = clean_json_response(
        response.text
    )

    result = json.loads(text)

    return normalize_evaluation(result)


# =========================================================
# Generate Next Question
# =========================================================

def generate_next_question(
    previous_question,
    previous_answer,
    preparation,
    resume_text="",
    job_description_text=""
):

    retrieval_question = f"""
Generate the next interview question after this
candidate response.

Previous Question:
{previous_question}

Previous Answer:
{previous_answer}

Find relevant skills, projects, job requirements
and preparation topics for the next question.
"""

    context = get_rag_context(
        question=retrieval_question,
        preparation=preparation,
        resume_text=resume_text,
        job_description_text=job_description_text
    )

    prompt = f"""
You are conducting a realistic professional interview.

RELEVANT CANDIDATE AND ROLE INFORMATION:

{context}

PERSONALIZED PREPARATION:

{json.dumps(preparation, indent=2)}

PREVIOUS QUESTION:

{previous_question}

PREVIOUS ANSWER:

{previous_answer}

Generate the NEXT interview question.

Rules:

1. Ask exactly ONE question.
2. Do not repeat the previous question.
3. Adapt the question based on the candidate's answer.
4. Use the candidate's resume and target job requirements
   when relevant.
5. Mix technical, behavioral, situational and
   role-specific questions where appropriate.
6. Ask realistic interview questions.
7. If the candidate mentioned a project or skill,
   use it for a deeper follow-up when appropriate.
8. Do not give the answer.
9. Do not give feedback.

Return ONLY JSON:

{{
    "question": ""
}}
"""

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt
    )

    text = clean_json_response(
        response.text
    )

    return json.loads(text)
