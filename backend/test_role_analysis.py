from services.gemini_service import analyze_interview_requirements


resume = """
Nishitha Sirapu

B.Tech Computer Science Engineering

Skills:
C, Java, Python, SQL
React, Spring Boot, REST APIs, MySQL
AI/ML, Generative AI, RAG, FastAPI
Docker, Kubernetes, Jenkins, AWS

Projects:
AI Interview Preparation Assistant
Health Record System
AI Bachelor-friendly Smart Housing Finder
"""


job_description = """
Company: RegisterKaro

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


result = analyze_interview_requirements(
    resume_text=resume,
    job_description_text=job_description
)


print("\n======================================")
print("AI ROLE ANALYSIS")
print("======================================")

print(result)