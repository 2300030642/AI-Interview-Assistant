from google import genai
from dotenv import load_dotenv
from pathlib import Path
import os
import json


# -----------------------------------------
# Load environment variables
# -----------------------------------------

BASE_DIR = Path(__file__).resolve().parents[2]

load_dotenv(BASE_DIR / ".env")


api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError(
        "GEMINI_API_KEY is not configured in .env"
    )


# -----------------------------------------
# Gemini client
# -----------------------------------------

client = genai.Client(
    api_key=api_key
)


# -----------------------------------------
# Analyze Resume + JD
# -----------------------------------------

def analyze_interview_requirements(
    resume_text,
    job_description_text
):

    prompt = f"""
You are an expert AI interview preparation assistant.

The student has provided:

1. Their resume
2. A job description

Your task is to understand the TARGET JOB and determine
what the student should prepare for the interview.

IMPORTANT:

- Do NOT calculate resume-JD matching percentage.
- Do NOT determine whether the student is eligible.
- Do NOT produce a compatibility score.
- Do NOT focus on missing resume keywords.
- Do NOT reject the candidate.

Instead, create a useful interview preparation analysis.

Understand the actual role from the job description.

Analyze:

1. Job role
2. Industry/domain
3. Seniority level
4. Main responsibilities
5. Technical knowledge if applicable
6. Domain knowledge
7. Soft skills
8. Behavioral expectations
9. Likely interview areas
10. Practical/scenario-based interview areas
11. Candidate's relevant background
12. Personalized preparation areas

The preparation must be specific to this job.

A technical role should produce technical preparation.

A sales role should produce sales/client preparation.

A testing role should produce testing/automation preparation.

A data role should produce data/SQL/analytics preparation.

Do not assume every job is technical.

Use the JD as the primary source for understanding the role.

Use the resume to understand the student's background
and personalize the preparation.

RESUME:

{resume_text}

JOB DESCRIPTION:

{job_description_text}

Return ONLY valid JSON.

Use exactly this structure:

{{
    "target_role": {{
        "job_title": "",
        "domain": "",
        "seniority": "",
        "role_summary": ""
    }},

    "role_responsibilities": [],

    "required_knowledge": [
        {{
            "topic": "",
            "category": "Technical",
            "importance": "High",
            "reason": ""
        }}
    ],

    "interview_areas": [
        {{
            "area": "",
            "type": "Technical",
            "importance": "High",
            "reason": ""
        }}
    ],

    "personalized_preparation": [
        {{
            "topic": "",
            "importance": "High",
            "reason": "",
            "what_to_prepare": []
        }}
    ],

    "candidate_context": [
        {{
            "area": "",
            "reason": ""
        }}
    ],

    "mock_interview": {{
        "type": "",
        "scenario": "",
        "evaluation_areas": []
    }}
}}

Rules:

- Return only JSON.
- Do not include markdown.
- Do not include ```json.
- Do not calculate a match percentage.
- Do not create a missing-skills list.
- Do not say whether the student is eligible.
"""


    # -----------------------------------------
    # Gemini request
    # -----------------------------------------

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt
    )


    # -----------------------------------------
    # Parse JSON
    # -----------------------------------------

    text = response.text.strip()


    if text.startswith("```json"):
        text = text[7:]

    if text.startswith("```"):
        text = text[3:]

    if text.endswith("```"):
        text = text[:-3]


    text = text.strip()


    return json.loads(text)

def generate_ai_chat(question, preparation):

    prompt = f"""
You are an AI Interview Preparation Assistant.

The student is preparing for an interview.

Here is the student's preparation:

{json.dumps(preparation, indent=2)}

Student's question:

{question}

Answer the student's question clearly and practically.

Rules:

1. Explain concepts in simple language.
2. Give examples wherever useful.
3. Relate the answer to the student's target role.
4. Use the student's projects and skills when relevant.
5. If the student asks an interview question, provide:
   - how to approach it
   - a strong sample answer
   - important points to mention
6. Do not invent information about the student's resume.
7. Keep the answer focused and useful.
"""

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt
    )

    return response.text.strip()