import { useMemo } from "react";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";


function SkillDetails({
  skill,
  onClose,
}) {

  if (!skill) {
    return null;
  }


  // =========================================================
  // NORMALIZE SKILL DATA
  // =========================================================

  const skillName =
    skill.name ||
    skill.title ||
    "Resume Skill";


  const description =
    skill.short_description ||
    skill.description ||
    "";


  const concepts =
    Array.isArray(skill.key_concepts)
      ? skill.key_concepts
      : Array.isArray(skill.core_concepts)
        ? skill.core_concepts
        : Array.isArray(skill.concepts)
          ? skill.concepts
          : [];


  const practicalUsage =
    Array.isArray(skill.practical_usage)
      ? skill.practical_usage
      : skill.practical_usage
        ? [skill.practical_usage]
        : [];


  const interviewQuestions =
    Array.isArray(skill.interview_questions)
      ? skill.interview_questions
      : [];


  const beginner =
    Array.isArray(skill.learning_path?.beginner)
      ? skill.learning_path.beginner
      : [];


  const intermediate =
    Array.isArray(skill.learning_path?.intermediate)
      ? skill.learning_path.intermediate
      : [];


  const advanced =
    Array.isArray(skill.learning_path?.advanced)
      ? skill.learning_path.advanced
      : [];


  const interviewReady =
    Array.isArray(skill.learning_path?.interview_ready)
      ? skill.learning_path.interview_ready
      : [];


  const visualization =
    skill.visualization || {};


  const nodesData =
    Array.isArray(visualization.nodes)
      ? visualization.nodes
      : [];


  const connections =
    Array.isArray(visualization.connections)
      ? visualization.connections
      : [];


  // =========================================================
  // REACT FLOW NODES
  // =========================================================

  const flowNodes = useMemo(() => {

    return nodesData.map((label, index) => ({
      id: String(index + 1),

      position: {
        x: (index % 3) * 260,
        y: Math.floor(index / 3) * 140,
      },

      data: {
        label: String(label),
      },

      style: {
        padding: "14px 20px",
        borderRadius: "12px",

        border: "2px solid #6366f1",

        background: "#ffffff",

        color: "#111827",

        fontSize: "14px",

        fontWeight: "600",

        minWidth: "180px",

        textAlign: "center",

        boxShadow:
          "0 5px 15px rgba(0,0,0,0.08)",
      },
    }));

  }, [nodesData]);


  // =========================================================
  // NODE ID MAP
  // =========================================================

  const nodeIdMap = useMemo(() => {

    const map = {};

    nodesData.forEach((node, index) => {

      map[
        String(node).trim()
      ] = String(index + 1);

    });

    return map;

  }, [nodesData]);


  // =========================================================
  // REACT FLOW EDGES
  // =========================================================

  const flowEdges = useMemo(() => {

    return connections
      .map((connection, index) => {

        let source;
        let target;


        // Example:
        // ["Java", "Selenium"]

        if (Array.isArray(connection)) {

          source = connection[0];

          target = connection[1];

        }


        // Example:
        // "Java -> Selenium"

        else if (
          typeof connection === "string"
        ) {

          const parts =
            connection.split("->");


          if (parts.length !== 2) {

            return null;

          }


          source =
            parts[0].trim();

          target =
            parts[1].trim();

        }


        if (!source || !target) {

          return null;

        }


        source =
          String(source).trim();

        target =
          String(target).trim();


        if (
          !nodeIdMap[source] ||
          !nodeIdMap[target]
        ) {

          return null;

        }


        return {

          id:
            `skill-edge-${index}`,

          source:
            nodeIdMap[source],

          target:
            nodeIdMap[target],

          animated: true,

          style: {
            strokeWidth: 2,
          },

        };

      })

      .filter(Boolean);

  }, [connections, nodeIdMap]);


  

  // =========================================================
  // RENDER
  // =========================================================

  return (

    <div className="skill-modal-overlay">


      <div className="skill-details-modal">


        {/* =================================================
            HEADER
        ================================================= */}

        <div className="skill-details-header">


          <div>

            <span className="skill-details-label">
              RESUME SKILL
            </span>


            <h1>
              {skillName}
            </h1>


            {description && (

              <p>
                {description}
              </p>

            )}

          </div>


          <button
            className="skill-close-button"
            onClick={onClose}
          >
            ✕
          </button>


        </div>


        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="skill-details-content">


          {/* =================================================
              WHAT IS THIS SKILL?
          ================================================= */}

          {skill.detailed_explanation && (

            <section className="skill-detail-section">

              <h2>
                📖 What is {skillName}?
              </h2>


              <div className="skill-description-box">

                <p>
                  {skill.detailed_explanation}
                </p>

              </div>

            </section>

          )}


          {/* =================================================
              WHY IMPORTANT
          ================================================= */}

          {skill.why_important && (

            <section className="skill-detail-section">

              <h2>
                🎯 Why Is This Skill Important?
              </h2>


              <div className="skill-jd-box">

                <p>
                  {skill.why_important}
                </p>

              </div>

            </section>

          )}


          {/* =================================================
              IMPORTANT TOPICS
          ================================================= */}

          {concepts.length > 0 && (

            <section className="skill-detail-section">

              <h2>
                📚 Important Topics
              </h2>


              <p className="section-description">

                Focus on these topics first when
                preparing {skillName} for your interview.

              </p>


              <div className="skill-topics-grid">

                {concepts.map(
                  (concept, index) => (

                    <div
                      className="skill-topic-card"
                      key={index}
                    >

                      <div className="skill-topic-number">
                        {index + 1}
                      </div>


                      <div>

                        <h3>
                          {concept}
                        </h3>

                        <p>
                          Prepare the basic concept,
                          practical usage and
                          interview questions related
                          to this topic.
                        </p>

                      </div>

                    </div>

                  )
                )}

              </div>

            </section>

          )}


          {/* =================================================
              WHAT YOU SHOULD KNOW
          ================================================= */}

          {skill.what_you_should_know && (

            <section className="skill-detail-section">

              <h2>
                🧠 What You Should Know
              </h2>


              <div className="skill-knowledge-box">

                <p>
                  {skill.what_you_should_know}
                </p>

              </div>

            </section>

          )}


          {/* =================================================
              PRACTICAL USAGE
          ================================================= */}

          {practicalUsage.length > 0 && (

            <section className="skill-detail-section">

              <h2>
                💡 Practical Usage
              </h2>


              <div className="skill-practical-list">

                {practicalUsage.map(
                  (item, index) => (

                    <div
                      className="skill-practical-item"
                      key={index}
                    >

                      <span>
                        ✓
                      </span>


                      <p>

                        {typeof item === "string"
                          ? item
                          : item?.description ||
                            item?.example ||
                            JSON.stringify(item)}

                      </p>

                    </div>

                  )
                )}

              </div>

            </section>

          )}


          {/* =================================================
              LEARNING PATH
          ================================================= */}

          {(beginner.length > 0 ||
            intermediate.length > 0 ||
            advanced.length > 0 ||
            interviewReady.length > 0) && (

            <section className="skill-detail-section">

              <h2>
                🛣️ Learning Path
              </h2>


              <div className="learning-path">


                {/* BEGINNER */}

                {beginner.length > 0 && (

                  <div className="learning-path-card">

                    <h3>
                      🌱 Beginner
                    </h3>


                    <ul>

                      {beginner.map(
                        (item, index) => (

                          <li key={index}>
                            {item}
                          </li>

                        )
                      )}

                    </ul>

                  </div>

                )}


                {/* INTERMEDIATE */}

                {intermediate.length > 0 && (

                  <div className="learning-path-card">

                    <h3>
                      📘 Intermediate
                    </h3>


                    <ul>

                      {intermediate.map(
                        (item, index) => (

                          <li key={index}>
                            {item}
                          </li>

                        )
                      )}

                    </ul>

                  </div>

                )}


                {/* ADVANCED */}

                {advanced.length > 0 && (

                  <div className="learning-path-card">

                    <h3>
                      🚀 Advanced
                    </h3>


                    <ul>

                      {advanced.map(
                        (item, index) => (

                          <li key={index}>
                            {item}
                          </li>

                        )
                      )}

                    </ul>

                  </div>

                )}


                {/* INTERVIEW READY */}

                {interviewReady.length > 0 && (

                  <div className="learning-path-card">

                    <h3>
                      🎯 Interview Ready
                    </h3>


                    <ul>

                      {interviewReady.map(
                        (item, index) => (

                          <li key={index}>
                            {item}
                          </li>

                        )
                      )}

                    </ul>

                  </div>

                )}

              </div>

            </section>

          )}


          {/* =================================================
              IMPORTANT INTERVIEW QUESTIONS
          ================================================= */}

          {interviewQuestions.length > 0 && (

            <section className="skill-detail-section">

              <h2>
                ❓ Important Interview Questions
              </h2>


              <p className="section-description">

                These are the important questions
                you should practice for {skillName}.

              </p>


              <div className="skill-question-list">

                {interviewQuestions.map(
                  (question, index) => (

                    <div
                      className="skill-question"
                      key={index}
                    >

                      <div className="question-number">
                        {index + 1}
                      </div>


                      <p>
                        {question}
                      </p>

                    </div>

                  )
                )}

              </div>

            </section>

          )}


          {/* =================================================
              REAL WORLD
          ================================================= */}

          {skill.real_world_example && (

            <section className="skill-detail-section">

              <h2>
                🌍 Real-World Usage
              </h2>


              <div className="skill-real-world">

                <strong>
                  How this skill is used in practice
                </strong>


                <p>
                  {skill.real_world_example}
                </p>

              </div>

            </section>

          )}


          {/* =================================================
              RESUME CONNECTION
          ================================================= */}

          {skill.resume_connection && (

            <section className="skill-detail-section">

              <h2>
                📄 Connection to Your Resume
              </h2>


              <div className="skill-resume-box">

                <p>
                  {skill.resume_connection}
                </p>

              </div>

            </section>

          )}


          {/* =================================================
              JD CONNECTION
          ================================================= */}

          {skill.jd_connection && (

            <section className="skill-detail-section">

              <h2>
                🎯 Connection to Your Target Role
              </h2>


              <div className="skill-jd-box">

                <p>
                  {skill.jd_connection}
                </p>

              </div>

            </section>

          )}


          {/* =================================================
              DIAGRAM
          ================================================= */}

          {flowNodes.length > 0 && (

            <section className="skill-detail-section">

              <h2>
                🖼️ Related Diagram
              </h2>


              <p className="diagram-description">

                Use this interactive diagram to understand
                how the important parts of {skillName}
                are connected.

              </p>


              <div className="skill-flow-wrapper">

                <ReactFlow

                  nodes={flowNodes}

                  edges={flowEdges}

                  fitView

                  fitViewOptions={{
                    padding: 0.2,
                  }}

                  nodesDraggable={true}

                  nodesConnectable={false}

                  elementsSelectable={true}

                  zoomOnScroll={true}

                  panOnDrag={true}

                >

                  <Background />

                  <Controls />

                  <MiniMap />

                </ReactFlow>

              </div>

            </section>

          )}


        


        </div>


        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="skill-details-footer">

          <button
            className="skill-close-footer"
            onClick={onClose}
          >
            ← Back to Skills
          </button>

        </div>


      </div>

    </div>

  );
}


export default SkillDetails;