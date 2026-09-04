import { useState } from "react";

function AIChat({ preparation, onBack }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const userMessage = {
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
  };

  return (
    <div className="ai-chat-page">

      {/* =========================
          TOP BAR
      ========================= */}

      <div className="ai-chat-topbar">
        <button
          className="back-button"
          onClick={onBack}
        >
          ← Back to Preparation
        </button>
      </div>


      {/* =========================
          CHAT HEADER
      ========================= */}

      <div className="chat-header">

        <div>
          <h1>AI Preparation Chat</h1>

          <p>
            Ask questions about your interview preparation,
            resume, projects, skills or job description.
          </p>
        </div>

      </div>


      {/* =========================
          CHAT CONTENT
      ========================= */}

      <div className="chat-container">

        <div className="messages">

          {/* Welcome Message */}

          <div className="message assistant-message">

            <div className="message-role">
              🤖 AI
            </div>

            <div className="message-content">

              <p>👋 Hi!</p>

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

          </div>


          {/* User Messages */}

          {messages.map((message, index) => (

            <div
              key={index}
              className={`message ${
                message.role === "user"
                  ? "user-message"
                  : "assistant-message"
              }`}
            >

              <div className="message-role">
                {message.role === "user" ? "👤 You" : "🤖 AI"}
              </div>

              <div className="message-content">
                <p>{message.content}</p>
              </div>

            </div>

          ))}

        </div>


        {/* =========================
            INPUT
        ========================= */}

        <div className="chat-input-area">

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask your interview question..."
          />

          <button
            onClick={sendMessage}
            disabled={!input.trim()}
          >
            Send
          </button>

        </div>

      </div>

    </div>
  );
}

export default AIChat;