from google import genai
from dotenv import load_dotenv
from pathlib import Path
import os
import json


# =========================================
# LOAD ENVIRONMENT
# =========================================

BASE_DIR = Path(__file__).resolve().parents[2]

load_dotenv(BASE_DIR / ".env")

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError(
        "GEMINI_API_KEY is not configured in .env"
    )


# =========================================
# GEMINI CLIENT
# =========================================

client = genai.Client(
    api_key=api_key
)


# =========================================
# GENERATE COMPLETE PREPARATION
# =========================================


def _clean_json_response(text: str) -> dict:
    """Safely convert Gemini JSON output into a Python dictionary."""
    text = (text or "").strip()

    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]

    if text.endswith("```"):
        text = text[:-3]

    return json.loads(text.strip())


def _generate_json(prompt: str) -> dict:
    """Generate JSON from Gemini and parse it."""
    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt
    )
    return _clean_json_response(response.text)


def _extract_resume_inventory(resume_text: str) -> dict:
    """
    First Gemini pass: create a source-of-truth inventory of every
    resume skill, project and certification.
    """
    prompt = f"""
You are a resume information extraction system.

Read the COMPLETE resume below.

Extract ALL explicitly mentioned skills, projects and certifications.
Do not explain anything. Do not invent anything.

RESUME:
{resume_text}

Rules:

1. skills:
- Include skills from the Skills section.
- Also include programming languages, frameworks, databases, tools,
  platforms and technologies explicitly mentioned elsewhere.
- Remove duplicates.
- Do not add skills merely because they are common for the target role.

2. projects:
- Include EVERY project in the resume.
- Do not stop after the first project.
- Do not merge separate projects.
- Preserve project names as closely as possible.

3. certifications:
- Include EVERY certification in the resume.
- Do not merge separate certifications.
- Do not invent certifications.

Return ONLY valid JSON:

{{
  "skills": [],
  "projects": [],
  "certifications": []
}}
"""
    return _generate_json(prompt)


def generate_preparation(
    resume_text,
    job_description_text,
    role_analysis,
    web_research
):
    # ---------------------------------------------------------
    # STEP 1: Build a complete resume inventory
    # ---------------------------------------------------------
    inventory = _extract_resume_inventory(resume_text)

    skills = inventory.get("skills", [])
    projects = inventory.get("projects", [])
    certifications = inventory.get("certifications", [])

    # ---------------------------------------------------------
    # STEP 2: Generate the complete preparation
    # ---------------------------------------------------------
    prompt = f"""
You are an expert AI Interview Preparation Assistant.

Your purpose is ONLY to help a student prepare for an interview.

You receive:

1. Job Description
2. Resume
3. Role analysis
4. Current web research
5. Resume inventory extracted separately

The resume inventory is a COVERAGE CHECKLIST.
Every inventory project and certification MUST appear in the output.
Every important resume skill MUST be covered.

==================================================
JOB DESCRIPTION
==================================================

{job_description_text}

==================================================
RESUME
==================================================

{resume_text}

==================================================
ROLE ANALYSIS
==================================================

{role_analysis}

==================================================
CURRENT WEB RESEARCH
==================================================

{web_research}

==================================================
RESUME INVENTORY — SOURCE OF TRUTH
==================================================

{json.dumps(inventory, indent=2)}

==================================================
PROJECT PURPOSE
==================================================

This is NOT a resume screening system.

DO NOT:
- calculate resume-JD matching percentage
- determine eligibility
- show matched skills
- show missing skills
- recommend whether the student should apply

The purpose is:
"Help the student prepare for the interview."

==================================================
SECTION 1 — JD PREPARATION
==================================================

Generate 8-12 important topics based on the actual JD.

Each topic MUST contain:
- title
- importance
- theory
- important_concepts
- practical_examples
- real_world_application
- interview_questions
- common_mistakes
- visualization

Each topic must contain 5-8 interview questions.

Visualization must contain real structured nodes and connections.

==================================================
SECTION 2 — RESUME SKILL PREPARATION
==================================================

THIS SECTION IS CRITICAL.

Resume skill inventory:
{json.dumps(skills, indent=2)}

Do NOT return only 1 or 2 skills.

Rules:
- Include all important resume skills that are relevant for interview
  preparation.
- If the resume inventory has at least 10 genuine skills, output at
  least 10 separate skill objects.
- Target 10-15 skills when possible.
- If there are more than 15 skills, prioritize skills relevant to the
  JD and skills actually used in projects.
- If fewer than 10 genuine skills exist, include all genuine skills.
- NEVER invent a skill to reach 10.
- A skill explicitly mentioned anywhere in the resume may be included.
- Do not describe skills as missing skills.
- Do not calculate matching scores.

Every skill MUST be a separate object containing:
- skill
- importance
- overview
- key_concepts
- what_to_know
- practical_usage
- interview_questions
- role_connection

==================================================
SECTION 3 — RESUME PROJECT PREPARATION
==================================================

THIS SECTION IS CRITICAL.

Projects extracted from the resume:
{json.dumps(projects, indent=2)}

Create EXACTLY ONE project_preparation object for EVERY project above.

If there are 3 projects, output 3 project objects.
If there are 5 projects, output 5 project objects.

DO NOT:
- stop after Project 1
- omit later projects
- merge projects
- invent projects

For EVERY project include:
1. project overview
2. problem solved
3. main features
4. technologies used
5. explanation of each important technology
6. architecture
7. project workflow
8. why each technology was selected
9. challenges
10. possible improvements
11. technical interview questions
12. project explanation for HR
13. project explanation for technical interviewer
14. deep-dive questions
15. visualization

Only use information supported by the resume. If something is not
specified, say it is not specified instead of inventing it.

==================================================
SECTION 4 — CERTIFICATION PREPARATION
==================================================

THIS SECTION IS CRITICAL.

Certifications extracted from the resume:
{json.dumps(certifications, indent=2)}

Create EXACTLY ONE certification_preparation object for EVERY
certification above.

If there are 2 certifications, output 2 objects.
If there are 5 certifications, output 5 objects.

DO NOT omit later certifications or merge certifications.

For EVERY certification include:
- overview
- important_concepts
- important_technologies
- practical_knowledge
- interview_questions
- interview_explanation
- role_connection

Do not claim unsupported knowledge.

==================================================
SECTION 5 — GENERAL INTERVIEW QUESTIONS
==================================================

technical_questions:
8-12 for technical/technically oriented roles.

coding_questions:
5-10 if coding is relevant; otherwise [].

behavioral_questions:
minimum 10.

situational_questions:
minimum 10.

role_specific_questions:
minimum 10.

Questions must be based on the actual JD and resume.

==================================================
SECTION 6 — MOCK INTERVIEW
==================================================

Create a realistic role-specific mock interview.

Include:
- type
- scenario
- at least 8 questions
- evaluation_areas
- follow_up_strategy

==================================================
SECTION 7 — STUDY PLAN
==================================================

Create exactly 7 days.

Each day:
- day
- topic
- reason
- activities
- practice_tasks

==================================================
SECTION 8 — PERSONALIZED ADVICE
==================================================

Use the resume to personalize:
- projects to emphasize
- project explanations
- skills to revise
- certification explanations
- likely questions
- connection between experience and target role

Do not discuss eligibility gaps.

==================================================
VISUALIZATION FORMAT
==================================================

Every visualization must use structured data such as:

{{
  "type": "flowchart",
  "title": "",
  "nodes": [],
  "connections": []
}}

Possible types:
flowchart, process, funnel, cycle, mindmap, comparison,
architecture, timeline, hierarchy.

==================================================
FINAL VALIDATION — DO THIS BEFORE RETURNING
==================================================

Check internally:

- jd_preparation has 8-12 topics.
- Every JD topic has theory, concepts, examples, questions and visualization.
- If resume inventory has >=10 skills, resume_skill_preparation has >=10.
- Every selected skill is a separate object.
- project_preparation count equals inventory project count.
- certification_preparation count equals inventory certification count.
- behavioral_questions >= 10.
- situational_questions >= 10.
- role_specific_questions >= 10.
- mock interview >= 8 questions.
- study plan has exactly 7 days.
- No invented resume facts.
- No eligibility information.

If anything is missing, FIX IT before returning.

==================================================
RETURN ONLY VALID JSON
==================================================

{{
  "target_role": {{
    "job_title": "",
    "domain": "",
    "seniority": "",
    "overview": ""
  }},

  "jd_preparation": {{
    "topics": []
  }},

  "resume_skill_preparation": [
    {{
      "skill": "",
      "importance": "",
      "overview": "",
      "key_concepts": [],
      "what_to_know": "",
      "practical_usage": [],
      "interview_questions": [],
      "role_connection": ""
    }}
  ],

  "project_preparation": [
    {{
      "project_name": "",
      "overview": "",
      "problem_solved": "",
      "main_features": [],
      "technologies": [],
      "technology_explanations": [],
      "architecture": "",
      "workflow": [],
      "why_technologies": [],
      "challenges": [],
      "improvements": [],
      "hr_explanation": "",
      "technical_explanation": "",
      "technical_questions": [],
      "deep_dive_questions": [],
      "visualization": {{
        "type": "",
        "title": "",
        "nodes": [],
        "connections": []
      }}
    }}
  ],

  "certification_preparation": [
    {{
      "name": "",
      "overview": "",
      "important_concepts": [],
      "important_technologies": [],
      "practical_knowledge": [],
      "interview_questions": [],
      "interview_explanation": "",
      "role_connection": ""
    }}
  ],

  "technical_questions": [],
  "coding_questions": [],
  "behavioral_questions": [],
  "situational_questions": [],
  "role_specific_questions": [],

  "mock_interview": {{
    "type": "",
    "scenario": "",
    "questions": [],
    "evaluation_areas": [],
    "follow_up_strategy": ""
  }},

  "study_plan": [
    {{
      "day": 1,
      "topic": "",
      "reason": "",
      "activities": [],
      "practice_tasks": []
    }}
  ],

  "personalized_advice": []
}}

Return ONLY JSON.
Do not use markdown.
Do not use ```json.
Do not include explanations outside JSON.
"""

    preparation = _generate_json(prompt)

    # ---------------------------------------------------------
    # STEP 3: Hard validation
    # ---------------------------------------------------------
    output_skills = preparation.get("resume_skill_preparation", [])
    output_projects = preparation.get("project_preparation", [])
    output_certifications = preparation.get("certification_preparation", [])

    if len(skills) >= 10 and len(output_skills) < 10:
        raise ValueError(
            f"Gemini returned only {len(output_skills)} resume skills "
            f"although {len(skills)} skills were found in the resume."
        )

    if len(output_projects) != len(projects):
        raise ValueError(
            f"Project coverage error: expected {len(projects)} projects "
            f"but Gemini returned {len(output_projects)}."
        )

    if len(output_certifications) != len(certifications):
        raise ValueError(
            f"Certification coverage error: expected {len(certifications)} "
            f"but Gemini returned {len(output_certifications)}."
        )

    return preparation
