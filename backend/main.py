from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any
import tempfile
import os
from services.rag_service import generate_rag_answer
from services.gemini_service import client
from services.rag_service import (
    create_vector_store,
    search_relevant_context,
    get_context_text
)

from services.rag_service import (
    create_vector_store,
    search_relevant_context,
    get_context_text,
    generate_rag_answer
)

from services.gemini_service import client
# =========================================
# SERVICES
# =========================================

from services.mock_interview_service import (
    start_mock_interview,
    evaluate_answer,
    generate_next_question
)

from services.chat_service import ask_ai_chat
from services.pdf_service import extract_text_from_pdf
from services.gemini_service import analyze_interview_requirements
from services.preparation_service import generate_preparation
from services.web_research_service import research_job_preparation


# =========================================
# REQUEST MODELS
# =========================================

class AIChatRequest(BaseModel):
    question: str
    resume_text: str
    job_description_text: str
    preparation: Dict[str, Any]


class MockInterviewRequest(BaseModel):
    preparation: Dict[str, Any]
    resume_text: str = ""
    job_description_text: str = ""


class MockAnswerRequest(BaseModel):
    question: str
    answer: str
    preparation: Dict[str, Any]
    resume_text: str = ""
    job_description_text: str = ""


class NextQuestionRequest(BaseModel):
    previous_question: str
    previous_answer: str
    preparation: Dict[str, Any]
    resume_text: str = ""
    job_description_text: str = ""
# =========================================
# FASTAPI APPLICATION
# =========================================

app = FastAPI(
    title="AI Interview Preparation Assistant",
    description="AI-powered personalized interview preparation platform",
    version="1.0.0"
)


# =========================================
# CORS
# =========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://ai-interview-assistant-dusky-eight.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================
# HOME
# =========================================


@app.post("/rag-test")
async def rag_test(data: dict):

    try:

        text = data.get("text", "")
        question = data.get("question", "")

        if not text.strip():
            raise HTTPException(
                status_code=400,
                detail="Text is required"
            )

        if not question.strip():
            raise HTTPException(
                status_code=400,
                detail="Question is required"
            )

        result = generate_rag_answer(
            question=question,
            text=text,
            gemini_client=client
        )

        return result

    except Exception as error:

        print("RAG TEST ERROR:", error)

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    
@app.get("/")
def home():

    return {
        "message": "AI Interview Preparation Assistant is running"
    }


# =========================================
# PREPARE INTERVIEW
# =========================================

@app.post("/prepare-interview")
async def prepare_interview(
    resume: UploadFile = File(...),
    job_description: UploadFile = File(...)
):

    # -----------------------------------------
    # Validate Resume
    # -----------------------------------------

    if not resume.filename.lower().endswith(".pdf"):

        raise HTTPException(
            status_code=400,
            detail="Resume must be a PDF file"
        )


    # -----------------------------------------
    # Validate Job Description
    # -----------------------------------------

    if not job_description.filename.lower().endswith(".pdf"):

        raise HTTPException(
            status_code=400,
            detail="Job description must be a PDF file"
        )


    resume_path = None
    jd_path = None


    try:

        # -----------------------------------------
        # Read uploaded files
        # -----------------------------------------

        resume_contents = await resume.read()
        jd_contents = await job_description.read()


        # -----------------------------------------
        # Save Resume Temporarily
        # -----------------------------------------

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".pdf"
        ) as resume_file:

            resume_file.write(resume_contents)
            resume_path = resume_file.name


        # -----------------------------------------
        # Save Job Description Temporarily
        # -----------------------------------------

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".pdf"
        ) as jd_file:

            jd_file.write(jd_contents)
            jd_path = jd_file.name


        # -----------------------------------------
        # Extract Resume Text
        # -----------------------------------------

        resume_text = extract_text_from_pdf(
            resume_path
        )


        # -----------------------------------------
        # Extract JD Text
        # -----------------------------------------

        jd_text = extract_text_from_pdf(
            jd_path
        )


        # -----------------------------------------
        # Validate Extracted Text
        # -----------------------------------------

        if not resume_text or not resume_text.strip():

            raise HTTPException(
                status_code=400,
                detail="Could not extract text from resume PDF"
            )


        if not jd_text or not jd_text.strip():

            raise HTTPException(
                status_code=400,
                detail="Could not extract text from job description PDF"
            )


        # =========================================
        # STEP 1
        # Analyze Resume + Job Description
        # =========================================

        role_analysis = analyze_interview_requirements(
            resume_text=resume_text,
            job_description_text=jd_text
        )


        # =========================================
        # STEP 2
        # Web Research
        # =========================================

        web_research = research_job_preparation(
            job_description=jd_text,
            resume_text=resume_text
        )


        # =========================================
        # STEP 3
        # Generate Personalized Preparation
        # =========================================

        preparation = generate_preparation(
            resume_text=resume_text,
            job_description_text=jd_text,
            role_analysis=role_analysis,
            web_research=web_research
        )


        # =========================================
        # RETURN RESULT
        # =========================================

        return {

    "message":
        "Interview preparation generated successfully",

    "resume": {
        "filename": resume.filename
    },

    "job_description": {
        "filename": job_description.filename
    },

    "role_analysis": role_analysis,

    "web_research": web_research,

    "preparation": preparation,

    # Extracted text for RAG / AI Chat
    "resume_text": resume_text,

    "job_description_text": jd_text
}


    except HTTPException:
        raise


    except Exception as error:

        print(
            "Preparation error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


    finally:

        # -----------------------------------------
        # Delete Temporary Resume
        # -----------------------------------------

        if (
            resume_path
            and os.path.exists(resume_path)
        ):

            os.remove(resume_path)


        # -----------------------------------------
        # Delete Temporary JD
        # -----------------------------------------

        if (
            jd_path
            and os.path.exists(jd_path)
        ):

            os.remove(jd_path)


# =========================================
# AI PREPARATION CHAT
# =========================================

# =========================================
# AI CHAT WITH RAG
# =========================================

@app.post("/ai-chat")
async def ai_chat(request: AIChatRequest):

    try:

        result = generate_rag_answer(
            question=request.question,
            resume_text=request.resume_text,
            job_description_text=request.job_description_text,
            preparation=request.preparation,
            gemini_client=client
        )

        return {
            "answer": result["answer"]
        }

    except Exception as error:

        print("AI CHAT ERROR:", error)

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

# =========================================
# START MOCK INTERVIEW
# =========================================

@app.post("/mock-interview/start")
async def mock_interview_start(
    request: MockInterviewRequest
):

    try:

        result = start_mock_interview(
            preparation=request.preparation,
            resume_text=request.resume_text,
            job_description_text=request.job_description_text
        )

        return result

    except Exception as error:

        print(
            "Mock Interview Start Error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# =========================================
# EVALUATE MOCK INTERVIEW ANSWER
# =========================================

@app.post("/mock-interview/evaluate")
async def mock_interview_evaluate(
    request: MockAnswerRequest
):

    try:

        result = evaluate_answer(
            question=request.question,
            answer=request.answer,
            preparation=request.preparation,
            resume_text=request.resume_text,
            job_description_text=request.job_description_text
        )

        return result

    except Exception as error:

        print(
            "Mock Interview Evaluation Error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# =========================================
# EVALUATE ANSWER + PREPARE NEXT QUESTION
# =========================================

@app.post("/mock-interview/continue")
async def mock_interview_continue(
    request: MockAnswerRequest
):

    try:

        # First evaluate the candidate's current answer.
        evaluation = evaluate_answer(
            question=request.question,
            answer=request.answer,
            preparation=request.preparation,
            resume_text=request.resume_text,
            job_description_text=request.job_description_text
        )

        # Then generate the next personalized question using RAG.
        next_result = generate_next_question(
            previous_question=request.question,
            previous_answer=request.answer,
            preparation=request.preparation,
            resume_text=request.resume_text,
            job_description_text=request.job_description_text
        )

        # generate_next_question returns {"question": "..."}.
        # The frontend expects the field name "next_question".
        next_question = str(next_result.get("question", "")).strip()

        if not next_question:
            raise ValueError("Gemini did not generate the next interview question")

        return {
            "evaluation": evaluation,
            "next_question": next_question
        }

    except Exception as error:

        print(
            "Mock Interview Continue Error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# =========================================
# GENERATE NEXT MOCK INTERVIEW QUESTION
# =========================================

@app.post("/mock-interview/next")
async def mock_interview_next(
    request: NextQuestionRequest
):

    try:

        result = generate_next_question(
            previous_question=request.previous_question,
            previous_answer=request.previous_answer,
            preparation=request.preparation,
            resume_text=request.resume_text,
            job_description_text=request.job_description_text
        )

        # Normalize the backend response to the field expected by the frontend.
        # generate_next_question() returns {"question": "..."}.
        next_question = str(result.get("question", "")).strip()

        if not next_question:
            raise ValueError("Gemini did not generate the next interview question")

        return {
            "next_question": next_question
        }

    except Exception as error:

        print(
            "Next Question Error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )
