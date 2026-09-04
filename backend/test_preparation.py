from services.gemini_service import analyze_interview_requirements
from services.preparation_service import generate_preparation
from services.web_research_service import research_job_preparation

import json


# =========================================
# SAMPLE RESUME
# =========================================

resume = """
B.Tech Computer Science Engineering student.

Skills:
Java, Python, SQL, React, Spring Boot, REST APIs,
MySQL, AI/ML, Generative AI, RAG, FastAPI,
Docker, Kubernetes, Jenkins, AWS.

Projects:
AI-Powered Interview Preparation Assistant
Health Record System
AI Bachelor-friendly Smart Housing Finder

Certifications:
AWS Certified Cloud Practitioner
Salesforce AI Associate
Oracle Cloud Infrastructure Certified Developer
Automation Anywhere Certified Essentials RPA Professional
"""


# =========================================
# SAMPLE JD
# =========================================

job_description = """
Job Title: Business Development Associate

We are seeking motivated Business Development Associates
with strong communication skills and a keen understanding
of business growth.

Responsibilities:

Client Acquisition:
Engage with potential clients, pitch services effectively,
and close deals.

Revenue Growth:
Convert leads into revenue-generating projects while
meeting monthly targets.

Relationship Management:
Communicate and build relationships with key decision-makers.

Service Presentation:
Present and explain service offerings clearly.

Requirements:

Graduate or Postgraduate in any field.

Strong communication skills in English and Hindi.

Self-driven, proactive, and eager to learn.

Comfortable with technology and working independently.
"""


# =========================================
# STEP 1 — ROLE ANALYSIS
# =========================================

print("\nAnalyzing role...")

role_analysis = analyze_interview_requirements(
    resume_text=resume,
    job_description_text=job_description
)


# =========================================
# STEP 2 — WEB RESEARCH
# =========================================

print("\nResearching current interview information...")

web_research = research_job_preparation(
    job_description=job_description,
    resume_text=resume
)


# =========================================
# STEP 3 — PREPARATION
# =========================================

print("\nGenerating complete preparation...")

preparation = generate_preparation(
    resume_text=resume,
    job_description_text=job_description,
    role_analysis=role_analysis,
    web_research=web_research
)


# =========================================
# DISPLAY RESULT
# =========================================

print("\n==========================================")
print("COMPLETE AI INTERVIEW PREPARATION")
print("==========================================")

print(
    json.dumps(
        preparation,
        indent=2,
        ensure_ascii=False
    )
)


# =========================================
# SUMMARY
# =========================================

print("\n==========================================")
print("PREPARATION SUMMARY")
print("==========================================")

print(
    "JD Topics:",
    len(
        preparation
        .get("jd_preparation", {})
        .get("topics", [])
    )
)

print(
    "Resume Skills:",
    len(
        preparation
        .get("resume_skill_preparation", [])
    )
)

print(
    "Projects:",
    len(
        preparation
        .get("project_preparation", [])
    )
)

print(
    "Certifications:",
    len(
        preparation
        .get("certification_preparation", [])
    )
)

print(
    "Behavioral Questions:",
    len(
        preparation
        .get("behavioral_questions", [])
    )
)

print(
    "Situational Questions:",
    len(
        preparation
        .get("situational_questions", [])
    )
)

print(
    "Role-specific Questions:",
    len(
        preparation
        .get("role_specific_questions", [])
    )
)

print(
    "Mock Interview Questions:",
    len(
        preparation
        .get("mock_interview", {})
        .get("questions", [])
    )
)