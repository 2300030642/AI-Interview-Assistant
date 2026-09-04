import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import axios from "axios";
import "./App.css";
import Visualization from "./components/Visualization";
import MockInterview from "./components/MockInterview";
import SkillDetails from "./components/SkillDetails";


function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === "string") {
    return value.trim() ? [value] : [];
  }

  return [JSON.stringify(value)];
}
function App() {

  const [preparation, setPreparation] = useState(null);

  const [resumeText, setResumeText] = useState("");
  const [jobDescriptionText, setJobDescriptionText] = useState("");

  // Uploaded files
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState(null);

  // Loading / errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Topic expansion
  const [expandedTopic, setExpandedTopic] = useState(null);

const [showMockInterview, setShowMockInterview] = useState(false);
  // AI chat
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);

const [mockInterviewQuestions, setMockInterviewQuestions] =
  useState([]);
  const [mockInterviewLoading, setMockInterviewLoading] = useState(false);
const [mockInterviewError, setMockInterviewError] = useState("");


const sendChatMessage = async () => {

  if (!chatInput.trim() || chatLoading) {
    return;
  }

  const userMessage = chatInput.trim();

  setChatMessages((previous) => [
    ...previous,
    {
      role: "user",
      message: userMessage,
    },
  ]);

  setChatInput("");
  setChatLoading(true);

  try {

  const response = await axios.post(
    "http://127.0.0.1:8000/ai-chat",
    {
      question: userMessage,
      resume_text: resumeText,
      job_description_text: jobDescriptionText,
      preparation: preparation,
    }
  );

    setChatMessages((previous) => [
      ...previous,
      {
        role: "ai",
        message:
          response.data.answer ||
          "I couldn't generate an answer.",
      },
    ]);

  } catch (error) {

    console.error(error);

    setChatMessages((previous) => [
      ...previous,
      {
        role: "ai",
        message:
          "Sorry, I couldn't connect to the AI assistant.",
      },
    ]);

  } finally {

    setChatLoading(false);

  }
};


  const handlePrepare = async () => {
  if (!resumeFile || !jobDescription) {
    setError("Please upload both your resume and job description.");
    return;
  }

  setError("");
  setLoading(true);

  try {
    const formData = new FormData();

    formData.append("resume", resumeFile);
    formData.append("job_description", jobDescription);

    const response = await axios.post(
      "http://127.0.0.1:8000/prepare-interview",
      formData
    );

    setPreparation(response.data.preparation);

setResumeText(response.data.resume_text || "");
setJobDescriptionText(
  response.data.job_description_text || ""
);

  } catch (err) {
    console.error("Preparation error:", err);

    setError(
      err.response?.data?.detail ||
      "Something went wrong while preparing your interview."
    );

  } finally {
    setLoading(false);
  }
};
const getMockInterviewQuestions = () => {
  const allQuestions = [
    ...toArray(preparation?.technical_questions),
    ...toArray(preparation?.coding_questions),
    ...toArray(preparation?.behavioral_questions),
    ...toArray(preparation?.situational_questions),
    ...toArray(preparation?.role_specific_questions),
  ];

  // Remove duplicate questions
  const uniqueQuestions = [...new Set(allQuestions)];

  // Shuffle questions so each mock interview can be different
  const shuffledQuestions = [...uniqueQuestions].sort(
    () => Math.random() - 0.5
  );

  // Select maximum 10 questions
  return shuffledQuestions.slice(0, 10);
};

const startRagMockInterview = async () => {
  if (!preparation) {
    return;
  }

  setMockInterviewLoading(true);
  setMockInterviewError("");

  try {
    const response = await axios.post(
      "http://127.0.0.1:8000/mock-interview/start",
      {
        preparation: preparation,
        resume_text: resumeText,
        job_description_text: jobDescriptionText,
      }
    );

    const firstQuestion = response.data.question;

    if (!firstQuestion) {
      throw new Error("No interview question was generated.");
    }

    console.log("RAG Mock Interview Question:", firstQuestion);

    // For Stage 1, start with the RAG-generated first question
    setMockInterviewQuestions([firstQuestion]);

    setShowMockInterview(true);

  } catch (error) {
    console.error("Mock Interview Error:", error);

    setMockInterviewError(
      error.response?.data?.detail ||
      error.message ||
      "Failed to start mock interview."
    );

  } finally {
    setMockInterviewLoading(false);
  }
};
  return (
    <div className="app">

      {/* Header */}

      <header className="header">

        <div className="logo">
          <span className="logo-icon">🤖</span>
          <div>
            <h2>AI Interview Assistant</h2>
            <p>AI-Powered Interview Preparation</p>
          </div>
        </div>

      </header>


      {!preparation ? (

        /* =========================
           UPLOAD SCREEN
        ========================= */

        <main className="upload-page">

          <section className="hero">

            <div className="hero-badge">
              AI • Personalized • Smart
            </div>

            <h1>
              Prepare Smarter.
              <br />
              <span>Interview Better.</span>
            </h1>

            <p>
              Upload your resume and job description.
              Our AI will create a personalized interview
              preparation plan for your specific role.
            </p>

          </section>


          <section className="upload-container">

            {/* Resume */}

            <div className="upload-card">

              <div className="upload-icon">
                📄
              </div>

              <h3>Upload Resume</h3>

              <p>
                Upload your latest resume in PDF format.
              </p>

              <label className="file-button">

                Choose Resume

                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) =>
                    setResumeFile(e.target.files[0])
                  }
                />

              </label>

              {resumeFile && (
                <div className="selected-file">
                  ✓ {resumeFile.name}
                </div>
              )}

            </div>


            {/* Job Description */}

            <div className="upload-card">

              <div className="upload-icon">
                💼
              </div>

              <h3>Upload Job Description</h3>

              <p>
                Upload the JD for the position you are
                preparing for.
              </p>

              <label className="file-button">

                Choose Job Description

                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) =>
                    setJobDescription(e.target.files[0])
                  }
                />

              </label>

              {jobDescription && (
                <div className="selected-file">
                  ✓ {jobDescription.name}
                </div>
              )}

            </div>

          </section>


          {error && (
            <div className="error-message">
              {error}
            </div>
          )}


          <button
            className="prepare-button"
            onClick={handlePrepare}
            disabled={loading}
          >

            {loading
              ? "Analyzing & Preparing..."
              : "🚀 Analyze & Prepare"
            }

          </button>


          <p className="privacy-text">
            Your documents are processed securely for
            personalized interview preparation.
          </p>

        </main>

      ) : (

        /* =========================
           PREPARATION DASHBOARD
        ========================= */

        <main className="dashboard">

          <section className="dashboard-header">

            <div>

              <div className="hero-badge">
                AI PREPARATION
              </div>

              <h1>
                {preparation.target_role?.job_title ||
                  "Interview Preparation"}
              </h1>

              <p>
                Personalized preparation generated from
                your resume and job description.
              </p>

            </div>

            <button
              className="new-preparation"
              onClick={() => {
  setPreparation(null);
  setResumeFile(null);
  setJobDescription(null);
  setError("");
  setExpandedTopic(null);
  setChatMessages([]);
  setShowMockInterview(false);
  setShowAIChat(false);
}}
            >
              ← New Preparation
            </button>

          </section>


          {/* Topics */}

          <section>

            <div className="section-title">
              <h2>📚 Preparation Topics</h2>

              <span>
                {preparation.jd_preparation.topics?.length || 0} Topics
              </span>
            </div>


            <div className="topic-grid">

              

               {toArray(preparation.topics).map((topic, index) => {

  const isExpanded = expandedTopic === index;

  return (
    <div
      className={`topic-card ${
        isExpanded ? "topic-card-expanded" : ""
      }`}
      key={index}
    >

      {/* -------------------------------- */}
      {/* Topic Header */}
      {/* -------------------------------- */}

      <div className="topic-number">
        {String(index + 1).padStart(2, "0")}
      </div>

      <div className="topic-main">

        <div className="topic-title-row">

          <div>
            <span className="topic-priority">
              {topic.importance || "High"}
            </span>

            <h3>
              {topic.title}
            </h3>

            <span className="topic-category">
              {topic.category}
            </span>
          </div>

        </div>


        {/* -------------------------------- */}
        {/* Short Explanation */}
        {/* -------------------------------- */}

        <div className="topic-summary">

          <p>
            {topic.theory}
          </p>

        </div>


        {/* -------------------------------- */}
        {/* Concepts Preview */}
        {/* -------------------------------- */}

        {topic.concepts &&
          topic.concepts.length > 0 && (

            <div className="concept-preview">

              <h4>
                🧠 Key Concepts
              </h4>

              <div className="concept-list">

                {topic.concepts
                  .slice(0, 4)
                  .map((concept, conceptIndex) => (

                    <span
                      className="concept-chip"
                      key={conceptIndex}
                    >
                      {concept}
                    </span>

                  ))}

                {topic.concepts.length > 4 && (

                  <span className="concept-more">
                    +{topic.concepts.length - 4} more
                  </span>

                )}

              </div>

            </div>

          )}


        {/* -------------------------------- */}
        {/* Expand Button */}
        {/* -------------------------------- */}

        <button
          className="topic-details-button"
          onClick={() =>
            setExpandedTopic(
              isExpanded ? null : index
            )
          }
        >

          {isExpanded
            ? "Hide Details ↑"
            : "View Full Preparation →"}

        </button>


        {/* ================================= */}
        {/* EXPANDED CONTENT */}
        {/* ================================= */}

        {isExpanded && (

          <div className="topic-details">


            {/* -------------------------------- */}
            {/* Theory */}
            {/* -------------------------------- */}

            <section className="detail-section">

              <h4>
                📖 Detailed Theory
              </h4>

              <p>
                {topic.theory ||
                  "No theory available."}
              </p>

            </section>


            {/* -------------------------------- */}
            {/* Concept Explanation */}
            {/* -------------------------------- */}

            {topic.concept_explanation && (

              <section className="detail-section">

                <h4>
                  🧠 Concept Explanation
                </h4>

                <p>
                  {topic.concept_explanation}
                </p>

              </section>

            )}


            {/* -------------------------------- */}
            {/* Concepts */}
            {/* -------------------------------- */}

            {topic.concepts &&
              topic.concepts.length > 0 && (

                <section className="detail-section">

                  <h4>
                    🔑 Important Concepts
                  </h4>

                  <div className="detailed-concepts">

                    {toArray(topic.concepts).map(
                      (concept, conceptIndex) => (

                        <div
                          className="detailed-concept"
                          key={conceptIndex}
                        >

                          <span>
                            {conceptIndex + 1}
                          </span>

                          <p>
                            {concept}
                          </p>

                        </div>

                      )
                    )}

                  </div>

                </section>

              )}


            {/* -------------------------------- */}
            {/* Practical Examples */}
            {/* -------------------------------- */}

            {topic.practical_examples &&
              topic.practical_examples.length > 0 && (

                <section className="detail-section">

                  <h4>
                    💡 Practical Examples
                  </h4>

                  <div className="example-list">

                    {toArray(topic.practical_examples).map((example, index) => (

                        <div
                          className="example-item"
                          key={index}
                        >

                          <span>
                            {index + 1}
                          </span>

                          <p>
                            {example}
                          </p>

                        </div>

                      )
                    )}

                  </div>

                </section>

              )}


            {/* -------------------------------- */}
            {/* Real World Application */}
            {/* -------------------------------- */}

            {topic.real_world_application && (

              <section className="detail-section">

                <h4>
                  🌍 Real-World Application
                </h4>

                <div className="real-world-box">

                  <p>
                    {topic.real_world_application}
                  </p>

                </div>

              </section>

            )}


            {/* -------------------------------- */}
            {/* Interview Questions */}
            {/* -------------------------------- */}

            {topic.interview_questions &&
              topic.interview_questions.length > 0 && (

                <section className="detail-section">

                  <h4>
                    ❓ Topic Interview Questions
                  </h4>

                  <div className="topic-questions">

                    {toArray(topic.interview_questions).map(
                      (question, questionIndex) => (

                        <div
                          className="topic-question"
                          key={questionIndex}
                        >

                          <span>
                            {questionIndex + 1}
                          </span>

                          <p>
                            {question}
                          </p>

                        </div>

                      )
                    )}

                  </div>

                </section>

              )}


            {/* -------------------------------- */}
            {/* Common Mistakes */}
            {/* -------------------------------- */}

            {topic.common_mistakes &&
              topic.common_mistakes.length > 0 && (

                <section className="detail-section">

                  <h4>
                    ⚠️ Common Mistakes
                  </h4>

                  <ul className="mistakes-list">

                    {toArray(topic.common_mistakes).map(
                      (mistake, mistakeIndex) => (

                        <li key={mistakeIndex}>
                          {mistake}
                        </li>

                      )
                    )}

                  </ul>

                </section>

              )}


            {/* -------------------------------- */}
            {/* Visualization */}
            {/* -------------------------------- */}

            {topic.visualization && (

              <section className="detail-section">

                <h4>
                  🖼️ Visual Learning
                </h4>

                <Visualization
                  visualization={
                    topic.visualization
                  }
                />

              </section>

            )}

          </div>

        )}

      </div>

    </div>
  );

})}

{preparation.resume_skill_preparation?.length > 0 && (
  <section className="resume-section">

    <div className="section-heading">
      <span>💻</span>

      <div>
        <h2>Resume Skills Preparation</h2>

        <p>
          Review the important skills mentioned in your resume and prepare
          for role-specific interview questions.
        </p>
      </div>
    </div>

    <div className="skill-preparation-grid">

      {preparation.resume_skill_preparation.map((skill, index) => (

        <div
          className="skill-preparation-card"
          key={index}
        >

          {/* CARD HEADER */}

          <div className="skill-card-header">

            <div>
              <span className="skill-number">
                {String(index + 1).padStart(2, "0")}
              </span>

              <h3>
                {skill.skill || skill.name || "Resume Skill"}
              </h3>
            </div>

            {skill.importance && (
              <span className="skill-importance">
                {skill.importance}
              </span>
            )}

          </div>


          {/* SHORT DESCRIPTION */}

          {skill.overview && (
            <p className="skill-card-overview">
              {skill.overview}
            </p>
          )}


          {/* KEY CONCEPTS */}

          {skill.key_concepts &&
            toArray(skill.key_concepts).length > 0 && (

            <div className="skill-card-concepts">

              {toArray(skill.key_concepts).slice(0, 4).map(
                (concept, conceptIndex) => (

                  <span
                    className="concept-chip"
                    key={conceptIndex}
                  >
                    {concept}
                  </span>

                )
              )}

            </div>

          )}


          {/* VIEW MORE BUTTON */}

          <button
  type="button"
  className="view-details-button"
  onClick={() => setSelectedSkill(skill)}
>
  View More Details
  <span>→</span>
</button>

        </div>

      ))}

    </div>

  </section>
)}

{preparation.project_preparation?.length > 0 && (
  <section className="resume-section">

    <div className="section-heading">
      <span>🚀</span>

      <div>
        <h2>Resume Project Preparation</h2>

        <p>
          Prepare to explain every project in your resume
          confidently during technical and HR interviews.
        </p>
      </div>
    </div>


    <div className="project-preparation-list">

      {toArray(preparation.project_preparation).map(
        (project, index) => (

          <div
            className="project-preparation-card"
            key={index}
          >

            <span className="project-number">
              PROJECT {index + 1}
            </span>

            <h3>
              {project.project_name}
            </h3>

            <h4>
              📌 Project Overview
            </h4>

            <p>
              {project.overview}
            </p>


            <h4>
              🎯 Problem Solved
            </h4>

            <p>
              {project.problem_solved}
            </p>


            <h4>
              ⚙️ Main Features
            </h4>

            <ul>
              {toArray(project.main_features).map(
                (feature, featureIndex) => (

                  <li key={featureIndex}>
                    {feature}
                  </li>

                )
              )}
            </ul>


            <h4>
              🛠 Technologies Used
            </h4>

            <div className="concept-list">

              {toArray(project.technologies).map(
                (technology, technologyIndex) => (

                  <span
                    className="concept-chip"
                    key={technologyIndex}
                  >
                    {technology}
                  </span>

                )
              )}

            </div>


            <h4>
              🧠 Technology Explanation
            </h4>

            <div className="technology-explanations">

              {toArray(project.technology_explanations).map(
                (item, itemIndex) => (

                  <div
                    className="technology-item"
                    key={itemIndex}
                  >
                    {item}
                  </div>

                )
              )}

            </div>


            <h4>
              ⚙️ Project Workflow
            </h4>

            <ol>
              {toArray(project.workflow).map(
                (step, stepIndex) => (

                  <li key={stepIndex}>
                    {step}
                  </li>

                )
              )}
            </ol>


            <h4>
              🤔 Why These Technologies?
            </h4>

            <ul>
              {toArray(project.why_technologies).map(
                (reason, reasonIndex) => (

                  <li key={reasonIndex}>
                    {reason}
                  </li>

                )
              )}
            </ul>


            <h4>
              ⚠️ Project Challenges
            </h4>

            <ul>
              {toArray(project.challenges).map(
                (challenge, challengeIndex) => (

                  <li key={challengeIndex}>
                    {challenge}
                  </li>

                )
              )}
            </ul>


            <h4>
              📈 Possible Improvements
            </h4>

            <ul>
              {toArray(project.improvements).map(
                (improvement, improvementIndex) => (

                  <li key={improvementIndex}>
                    {improvement}
                  </li>

                )
              )}
            </ul>


            <h4>
              👨‍💼 How to Explain to HR
            </h4>

            <div className="explanation-box">
              {project.hr_explanation}
            </div>


            <h4>
              👨‍💻 How to Explain to a Technical Interviewer
            </h4>

            <div className="explanation-box">
              {project.technical_explanation}
            </div>


            <h4>
              ❓ Technical Questions
            </h4>

            <ol>
              {toArray(project.technical_questions).map(
                (question, questionIndex) => (

                  <li key={questionIndex}>
                    {question}
                  </li>

                )
              )}
            </ol>


            <h4>
              🔍 Deep-Dive Questions
            </h4>

            <ol>
              {toArray(project.deep_dive_questions).map(
                (question, questionIndex) => (

                  <li key={questionIndex}>
                    {question}
                  </li>

                )
              )}
            </ol>


            {project.visualization && (
              <Visualization
                visualization={
                  project.visualization
                }
              />
            )}

          </div>

        )
      )}

    </div>

  </section>
)}

{preparation.certification_preparation?.length > 0 && (
  <section className="resume-section">

    <div className="section-heading">
      <span>🏆</span>

      <div>
        <h2>Certification Preparation</h2>

        <p>
          Revise the certifications listed on your resume
          and prepare for related interview questions.
        </p>
      </div>
    </div>


    <div className="certification-grid">

      {toArray(preparation.certification_preparation).map(
        (certification, index) => (

          <div
            className="certification-card"
            key={index}
          >

            <span className="certification-number">
              CERTIFICATION {index + 1}
            </span>

            <h3>
              🏆 {certification.name}
            </h3>


            <h4>
              📖 Overview
            </h4>

            <p>
              {certification.overview}
            </p>


            <h4>
              🧠 Important Concepts
            </h4>

            <div className="concept-list">

              {toArray(certification.important_concepts).map(
                (concept, conceptIndex) => (

                  <span
                    className="concept-chip"
                    key={conceptIndex}
                  >
                    {concept}
                  </span>

                )
              )}

            </div>


            <h4>
              🛠 Important Technologies / Services
            </h4>

            <ul>
              {toArray(certification.important_technologies).map(
                (technology, technologyIndex) => (

                  <li key={technologyIndex}>
                    {technology}
                  </li>

                )
              )}
            </ul>


            <h4>
              💡 Practical Knowledge
            </h4>

            <ul>
              {toArray(certification.practical_knowledge).map(
                (item, itemIndex) => (

                  <li key={itemIndex}>
                    {item}
                  </li>

                )
              )}
            </ul>


            <h4>
              ❓ Interview Questions
            </h4>

            <ol>
              {toArray(certification.interview_questions).map(
                (question, questionIndex) => (

                  <li key={questionIndex}>
                    {question}
                  </li>

                )
              )}
            </ol>


            <div className="explanation-box">

              <strong>
                🎤 How to Explain This Certification
              </strong>

              <p>
                {certification.interview_explanation}
              </p>

            </div>


            <div className="role-connection">

              <strong>
                🎯 Relation to Target Role
              </strong>

              <p>
                {certification.role_connection}
              </p>

            </div>

          </div>

        )
      )}

    </div>

  </section>
)}

            </div>

          </section>


          {/* Questions */}

          <section className="question-section">

            <div className="section-title">

              <h2>
                ❓ Interview Questions
              </h2>

            </div>


            <QuestionGroup
              title="💻 Technical Questions"
              questions={toArray(preparation.technical_questions)}
            />

            <QuestionGroup
              title="🧩 Coding Questions"
              questions={toArray(preparation.coding_questions)}
            />

            <QuestionGroup
              title="🧠 Behavioral Questions"
              questions={toArray(preparation.behavioral_questions)}
            />

            <QuestionGroup
              title="🎯 Situational Questions"
              questions={toArray(preparation.situational_questions)}
            />

            <QuestionGroup
              title="⭐ Role-Specific Questions"
              questions={toArray(preparation.role_specific_questions)}
            />

          </section>


          {/* Mock Interview */}

          {preparation.mock_interview && (

            <section className="mock-card">

              <div className="mock-icon">
                🎤
              </div>

              <div className="mock-content">

                <span className="hero-badge">
                  MOCK INTERVIEW
                </span>

                <h2>
                  Practice Like a Real Interview
                </h2>

                <p>
                  {preparation.mock_interview.scenario}
                </p>

                <button
                  type="button"
                  className="start-mock-interview-button"
                  onClick={startRagMockInterview}
                  disabled={mockInterviewLoading}
                >
                  {mockInterviewLoading ? (
                    <>
                      <span className="mock-button-spinner"></span>
                      Preparing Interview...
                    </>
                  ) : (
                    <>
                      🎤 Start Mock Interview
                      <span className="mock-button-arrow">→</span>
                    </>
                  )}
                </button>

{mockInterviewError && (
  <p style={{ color: "red", marginTop: "10px" }}>
    {mockInterviewError}
  </p>
)}

              </div>

            </section>

          )}


          {/* Study Plan */}

          {preparation.study_plan?.length > 0 && (

            <section className="study-section">

              <div className="section-title">

                <h2>
                  📅 Study Plan
                </h2>

              </div>


              <div className="study-grid">

                {toArray(preparation.study_plan).map(
                  (day, index) => (

                    <div
                      className="study-card"
                      key={index}
                    >

                      <span>
                        Day {day.day}
                      </span>

                      <h3>
                        {day.topic}
                      </h3>

                      <ul>

                        {toArray(day.activities).map(
                          (activity, i) => (
                            <li key={i}>
                              {activity}
                            </li>
                          )
                        )}

                      </ul>

                    </div>

                  )
                )}

              </div>

            </section>

          )}


          {/* AI Chat */}

          <section className="chat-preview">

            <div className="chat-icon">
              💬
            </div>

            <div>

              <span className="hero-badge">
                AI PREPARATION CHAT
              </span>

              <h2>
                Have a Question?
              </h2>

              <p>
                Ask anything about your preparation.
                Learn concepts, clarify doubts and
                practice interview questions with AI.
              </p>

            </div>

            <button
  className="start-button"
  onClick={() => setShowAIChat(true)}
>
  Open AI Chat →
</button>

          </section>

          
{/* =========================
    AI CHAT MODAL
========================= */}

{showAIChat && (

  <div className="modal-overlay">

    <div className="modal-card chat-modal">
<button
        className="modal-close"
        onClick={() => setShowAIChat(false)}
      >
        ✕
      </button>

      <div className="modal-icon">
        💬
      </div>

      <h2>
        AI Preparation Chat
      </h2>

      <p className="chat-subtitle">
        Ask questions about your interview preparation,
        resume, projects, skills or job description.
      </p>

      <div className="chat-messages">

        {chatMessages.length === 0 && (

          <div className="chat-welcome">

            <strong>
              👋 Hi!
            </strong>

            <p>
              Ask me anything about your interview preparation.
            </p>

            <p>
              For example:
            </p>

            <ul>
              <li>
                Explain Selenium in simple words.
              </li>

              <li>
                How should I explain my project?
              </li>

              <li>
                Ask me a Java interview question.
              </li>

              <li>
                How should I answer "Tell me about yourself"?
              </li>
            </ul>

          </div>

        )}

        {chatMessages.map((chat, index) => (

  <div
    key={index}
    className={
      chat.role === "user"
        ? "chat-message user-message"
        : "chat-message ai-message"
    }
  >

    <strong>
      {chat.role === "user"
        ? "You"
        : "🤖 AI"}
    </strong>

    {chat.role === "user" ? (
      <p>{chat.message}</p>
    ) : (
      <div className="ai-message-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {chat.message}
        </ReactMarkdown>
      </div>
    )}

  </div>

))}

        {chatLoading && (

          <div className="chat-message ai-message">

            <strong>
              🤖 AI
            </strong>

            <p>
              Thinking...
            </p>

          </div>

        )}

      </div>

      <div className="chat-input-area">

        <input
          type="text"
          value={chatInput}
          placeholder="Ask your interview question..."
          onChange={(e) =>
            setChatInput(e.target.value)
          }
          onKeyDown={(e) => {

            if (e.key === "Enter") {
              sendChatMessage();
            }

          }}
        />

        <button
          onClick={sendChatMessage}
          disabled={
            chatLoading ||
            !chatInput.trim()
          }
        >
          Send
        </button>

      </div>

    </div>

  </div>

)}
        </main>

      )}
      {showMockInterview && preparation?.mock_interview && (
  <MockInterview
  mockInterview={{
    ...preparation.mock_interview,
    questions: mockInterviewQuestions,
  }}
  resumeText={resumeText}
  jobDescriptionText={jobDescriptionText}
  preparation={preparation}
  onClose={() => setShowMockInterview(false)}
/>
)}

    {selectedSkill && (
  <SkillDetails
    skill={selectedSkill}
    onClose={() => setSelectedSkill(null)}
  />
)}


    </div>
  );
}


/* =========================
   QUESTION GROUP
========================= */

function QuestionGroup({ title, questions }) {
  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <div className="question-group">

      <h3>
        {title}
      </h3>

      <div className="questions">

        {questions.map((question, index) => (
          <div
            className="question"
            key={index}
          >
            <span>
              {index + 1}
            </span>

            <p>
              {question}
            </p>
          </div>
        ))}

      </div>
        
    </div>
  );
}


export default App;