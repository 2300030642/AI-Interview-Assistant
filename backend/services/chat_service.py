from google import genai
from dotenv import load_dotenv
from pathlib import Path
import os
import json


# -----------------------------------------
# Load environment
# -----------------------------------------

BASE_DIR = Path(__file__).resolve().parents[2]

load_dotenv(BASE_DIR / ".env")

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY is not configured in .env")


client = genai.Client(api_key=api_key)


# -----------------------------------------
# AI Preparation Chat
# -----------------------------------------

def ask_ai_chat(message, preparation):

    prompt = f"""
You are the AI assistant inside an Interview Preparation
platform.

The student has uploaded a resume and job description.

Their personalized preparation is:

{json.dumps(preparation, indent=2)}

Student's question:

{message}

Your task:

1. Answer the student's question clearly.
2. Explain concepts in simple language.
3. Give examples when useful.
4. If the question relates to the target role,
   connect the explanation to that role.
5. If the question relates to a preparation topic,
   use the preparation information.
6. If the student asks about an interview question,
   explain how they should approach the answer.
7. If the student asks about a resume skill,
   explain what it means and how it may be asked
   in an interview.
8. Do not discuss resume-JD eligibility or matching scores.
9. Do not say whether the student should apply.
10. Focus only on learning and interview preparation.

Return a useful natural-language answer.
"""

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt
    )

    return response.text.strip()