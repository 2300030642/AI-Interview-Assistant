import { useEffect, useRef, useState } from "react";

function MockInterview({
  mockInterview,
  resumeText,
  jobDescriptionText,
  preparation,
  onClose,
}) {
  const initialQuestions = Array.isArray(mockInterview?.questions)
  ? mockInterview.questions
  : [];

const [questions, setQuestions] = useState(initialQuestions);

  const TOTAL_TIME = 60;

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);

  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingFinished, setRecordingFinished] = useState(false);

  const [recordedUrl, setRecordedUrl] = useState(null);
  const [error, setError] = useState("");
  const [answerText, setAnswerText] = useState("");
const [evaluating, setEvaluating] = useState(false);
const [evaluation, setEvaluation] = useState(null);
  const [evaluationHistory, setEvaluationHistory] = useState([]);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [finalSummary, setFinalSummary] = useState(null);
  const [pendingNextQuestion, setPendingNextQuestion] = useState("");
  const MAX_QUESTIONS = 10;

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const speechRecognitionRef = useRef(null);
const transcriptRef = useRef("");

  const timerRef = useRef(null);

  // =========================================================
  // CAMERA + MICROPHONE
  // =========================================================

  // IMPORTANT: camera and microphone have their own MediaStreams.
  // Turning one device on/off never stops the other device.
  const cameraStreamRef = useRef(null);
  const microphoneStreamRef = useRef(null);
  const recordingStreamRef = useRef(null);

  const getCameraTrack = () => {
    return cameraStreamRef.current?.getVideoTracks()?.find(
      (track) => track.readyState === "live"
    ) || null;
  };

  const getMicrophoneTrack = () => {
    return microphoneStreamRef.current?.getAudioTracks()?.find(
      (track) => track.readyState === "live"
    ) || null;
  };

  const updateVideoPreview = () => {
    if (!videoRef.current) return;

    const cameraStream = cameraStreamRef.current;

    if (cameraStream && getCameraTrack()) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.srcObject = null;
    }
  };

  const ensureCamera = async () => {
    let track = getCameraTrack();

    if (!track) {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is not supported by this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      track = stream.getVideoTracks()[0];

      if (!track) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error("No camera track was provided by the browser.");
      }

      cameraStreamRef.current = stream;
    }

    track.enabled = true;
    setCameraEnabled(true);
    updateVideoPreview();
    return track;
  };

  const ensureMicrophone = async () => {
    let track = getMicrophoneTrack();

    if (!track) {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not supported by this browser.");
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        track = stream.getAudioTracks()[0];

        if (!track) {
          stream.getTracks().forEach((t) => t.stop());
          throw new Error("No microphone track was provided by the browser.");
        }

        microphoneStreamRef.current = stream;
      } catch (err) {
        console.error("Microphone permission/device error:", err);

        if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
          throw new Error(
            "Microphone access was blocked. In Chrome, open Site settings for localhost:5173 and set Microphone to Allow. If Chrome does not show Microphone there, enable Windows Settings → Privacy & security → Microphone → Microphone access and Let desktop apps access your microphone."
          );
        }

        if (err?.name === "NotFoundError") {
          throw new Error("No microphone was found. Connect/select a microphone and try again.");
        }

        if (err?.name === "NotReadableError") {
          throw new Error("The microphone is being used or blocked by another application.");
        }

        throw new Error(err?.message || "Unable to access the microphone.");
      }
    }

    track.enabled = true;
    setMicEnabled(true);
    return track;
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    setCameraEnabled(false);
    updateVideoPreview();
  };

  const stopMicrophone = () => {
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach((track) => track.stop());
      microphoneStreamRef.current = null;
    }

    setMicEnabled(false);
  };

  const stopAllMedia = () => {
    // Stop recorder first.
    if (recorderRef.current) {
      try {
        if (recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
      } catch (err) {
        console.error("Recorder cleanup error:", err);
      }
      recorderRef.current = null;
    }

    // Stop speech recognition.
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (err) {
        // already stopped
      }
      speechRecognitionRef.current = null;
    }

    // Stop every possible media stream.
    const streams = [
      cameraStreamRef.current,
      microphoneStreamRef.current,
      recordingStreamRef.current,
    ];

    streams.forEach((stream) => {
      if (stream) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (err) {
            // ignore cleanup errors
          }
        });
      }
    });

    cameraStreamRef.current = null;
    microphoneStreamRef.current = null;
    recordingStreamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause?.();
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute("src");
      videoRef.current.load?.();
    }

    setCameraEnabled(false);
    setMicEnabled(false);
    setIsRecording(false);
  };

  // Cleanup when the component is unmounted.
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      timerRef.current = null;

      if (recorderRef.current) {
        try {
          if (recorderRef.current.state !== "inactive") {
            recorderRef.current.stop();
          }
        } catch (err) {
          // ignore cleanup errors
        }
      }

      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (err) {
          // ignore cleanup errors
        }
      }

      [
        cameraStreamRef.current,
        microphoneStreamRef.current,
        recordingStreamRef.current,
      ].forEach((stream) => {
        stream?.getTracks()?.forEach((track) => track.stop());
      });

      cameraStreamRef.current = null;
      microphoneStreamRef.current = null;
      recordingStreamRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  // =========================================================
  // TIMER
  // =========================================================

  const startTimer = () => {
    clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;

          setTimeout(() => {
            if (recorderRef.current?.state === "recording") {
              stopRecording();
            }
          }, 0);

          return 0;
        }

        return previous - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  };

  // =========================================================
  // FORMAT TIMER
  // =========================================================

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };


  const startSpeechRecognition = () => {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setError(
      "Speech recognition is not supported in this browser. Please use Google Chrome."
    );
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  transcriptRef.current = "";
  setAnswerText("");

  recognition.onresult = (event) => {
    let transcript = "";

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {
      if (event.results[i].isFinal) {
        transcript += event.results[i][0].transcript + " ";
      }
    }

    transcriptRef.current += transcript;

    setAnswerText(transcriptRef.current.trim());
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);

    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      setError(
        "Microphone access for speech recognition was denied. Please allow microphone access in Chrome."
      );
    }
  };

  recognition.onend = () => {
    console.log("Speech recognition ended.");
  };

  speechRecognitionRef.current = recognition;

  try {
    recognition.start();
  } catch (err) {
    console.log("Speech recognition already started.");
  }
};

const stopSpeechRecognition = () => {
  if (speechRecognitionRef.current) {
    try {
      speechRecognitionRef.current.stop();
    } catch (err) {
      console.log("Speech recognition already stopped.");
    }

    speechRecognitionRef.current = null;
  }
};
  // =========================================================
  // START RECORDING
  // =========================================================

  const startRecording = async () => {
    if (isRecording) return;

    try {
      setError("");

      // Request each device separately. If the mic is blocked,
      // the camera remains available and is not turned off.
      const cameraTrack = await ensureCamera();
      const microphoneTrack = await ensureMicrophone();

      if (!cameraTrack || !microphoneTrack) {
        throw new Error("Both camera and microphone are required for video recording.");
      }

      const recordingStream = new MediaStream([
        cameraTrack,
        microphoneTrack,
      ]);

      recordingStreamRef.current = recordingStream;

      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
        setRecordedUrl(null);
      }

      chunksRef.current = [];

      let options = {};
      if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
        options = { mimeType: "video/webm;codecs=vp9,opus" };
      } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
        options = { mimeType: "video/webm;codecs=vp8,opus" };
      } else if (MediaRecorder.isTypeSupported("video/webm")) {
        options = { mimeType: "video/webm" };
      }

      const recorder = new MediaRecorder(recordingStream, options);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: "video/webm" });
          setRecordedUrl(URL.createObjectURL(blob));
        }

        setRecordingFinished(true);
        recorderRef.current = null;
        recordingStreamRef.current = null;
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError("Recording failed. Please try again.");
        setIsRecording(false);
        setRecordingFinished(false);
        stopTimer();
      };

      recorder.start(1000);

      setIsRecording(true);
      setRecordingFinished(false);
      setAnswerText("");
      setEvaluation(null);
      transcriptRef.current = "";
      setTimeLeft(TOTAL_TIME);

      startSpeechRecognition();
      startTimer();
    } catch (err) {
      console.error("Recording error:", err);
      setIsRecording(false);
      setRecordingFinished(false);
      stopTimer();
      setError(
        err?.message ||
          "Unable to start recording. Please allow camera and microphone access and try again."
      );
    }
  };

  // =========================================================
  // STOP RECORDING
  // =========================================================

  const stopRecording = () => {
    stopTimer();
    stopSpeechRecognition();

    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch (err) {
        console.error("Stop recording error:", err);
      }
    } else {
      setRecordingFinished(true);
    }

    setIsRecording(false);
  };

  // =========================================================
  // COMPLETE / CLOSE INTERVIEW
  // =========================================================

  const completeInterview = () => {
    if (isRecording) return;
    handleClose();
  };

  // =========================================================
  // NEXT QUESTION / EVALUATION
  // =========================================================

  const buildFinalReport = (history) => {
    const scores = history
      .map((item) => Number(item.evaluation?.score))
      .filter(Number.isFinite);

    const averageScore = scores.length
      ? Number(
          (scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(1)
        )
      : 0;

    const strengths = [
      ...new Set(
        history.flatMap((item) =>
          Array.isArray(item.evaluation?.strengths)
            ? item.evaluation.strengths
            : []
        )
      ),
    ].slice(0, 8);

    const improvements = [
      ...new Set(
        history.flatMap((item) =>
          Array.isArray(item.evaluation?.improvements)
            ? item.evaluation.improvements
            : []
        )
      ),
    ].slice(0, 8);

    return {
      totalQuestions: history.length,
      averageScore,
      strengths,
      improvements,
    };
  };

  const moveToPreparedNextQuestion = () => {
    if (!pendingNextQuestion) return;

    const nextQuestionText = pendingNextQuestion;

    setQuestions((previous) => [...previous, nextQuestionText]);
    setPendingNextQuestion("");

    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }

    setRecordedUrl(null);
    setRecordingFinished(false);
    setAnswerText("");
    setEvaluation(null);
    transcriptRef.current = "";
    setTimeLeft(TOTAL_TIME);
    setCurrentQuestion((previous) => previous + 1);
    setError("");
  };

  const nextQuestion = async () => {
    if (isRecording || evaluating) return;

    // After the AI has already prepared the next question,
    // moving to it is instant and requires NO API call.
    if (pendingNextQuestion) {
      moveToPreparedNextQuestion();
      return;
    }

    // On Question 10, after evaluation is visible, the next click
    // builds the final report locally. No additional AI call.
    if (currentQuestion + 1 >= MAX_QUESTIONS && evaluation) {
      const finalHistory = [
        ...evaluationHistory.filter(
          (item) => item.question !== questions[currentQuestion]
        ),
        {
          question: questions[currentQuestion],
          answer: (transcriptRef.current || answerText || "").trim(),
          evaluation: {
            ...evaluation,
            score: Number(evaluation?.score ?? 0),
            strengths: Array.isArray(evaluation?.strengths)
              ? evaluation.strengths
              : evaluation?.strengths
                ? [evaluation.strengths]
                : [],
            improvements: Array.isArray(evaluation?.improvements)
              ? evaluation.improvements
              : evaluation?.improvements
                ? [evaluation.improvements]
                : [],
          },
        },
      ];

      const report = buildFinalReport(finalHistory);
      setEvaluationHistory(finalHistory);
      setFinalSummary(report);
      setInterviewCompleted(true);
      return;
    }

    const answer = (transcriptRef.current || answerText || "").trim();

    if (!answer) {
      setError(
        "No spoken answer was detected. Please record your answer and speak clearly before continuing."
      );
      return;
    }

    setError("");
    setEvaluating(true);

    try {
      // Q10 only needs evaluation. After it is displayed,
      // the next click creates the final report locally.
      if (currentQuestion + 1 >= MAX_QUESTIONS) {
        const response = await fetch(
          "https://ai-interview-assistant-o86b.onrender.com/mock-interview/evaluate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: questions[currentQuestion],
              answer,
              preparation,
              resume_text: resumeText,
              job_description_text: jobDescriptionText,
            }),
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.detail || data.error || "Failed to evaluate your answer."
          );
        }

        const safeEvaluation = {
          score: Number(data.score ?? 0),
          feedback: data.feedback || "No feedback was provided.",
          strengths: Array.isArray(data.strengths)
            ? data.strengths
            : data.strengths
              ? [data.strengths]
              : [],
          improvements: Array.isArray(data.improvements)
            ? data.improvements
            : data.improvements
              ? [data.improvements]
              : [],
        };

        setEvaluation(safeEvaluation);
        setEvaluationHistory((previous) => [
          ...previous.filter(
            (item) => item.question !== questions[currentQuestion]
          ),
          {
            question: questions[currentQuestion],
            answer,
            evaluation: safeEvaluation,
          },
        ]);

        return;
      }

      // Q1-Q9: use the two backend endpoints that already exist:
      // 1) evaluate the current answer
      // 2) generate the next personalized question
      // This avoids the /mock-interview/continue 404 problem.

      const evaluationResponse = await fetch(
        "https://ai-interview-assistant-o86b.onrender.com/mock-interview/evaluate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: questions[currentQuestion],
            answer,
            preparation,
            resume_text: resumeText,
            job_description_text: jobDescriptionText,
          }),
        }
      );

      const evaluationData = await evaluationResponse.json().catch(() => ({}));

      if (!evaluationResponse.ok) {
        throw new Error(
          evaluationData.detail ||
            evaluationData.error ||
            "Failed to evaluate your answer."
        );
      }

      const safeEvaluation = {
        score: Number(evaluationData.score ?? 0),
        feedback: evaluationData.feedback || "No feedback was provided.",
        strengths: Array.isArray(evaluationData.strengths)
          ? evaluationData.strengths
          : evaluationData.strengths
            ? [evaluationData.strengths]
            : [],
        improvements: Array.isArray(evaluationData.improvements)
          ? evaluationData.improvements
          : evaluationData.improvements
            ? [evaluationData.improvements]
            : [],
      };

      const nextResponse = await fetch(
        "https://ai-interview-assistant-o86b.onrender.com/mock-interview/next",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            previous_question: questions[currentQuestion],
            previous_answer: answer,
            preparation,
            resume_text: resumeText,
            job_description_text: jobDescriptionText,
          }),
        }
      );

      const nextData = await nextResponse.json().catch(() => ({}));

      if (!nextResponse.ok) {
        throw new Error(
          nextData.detail ||
            nextData.error ||
            "Failed to prepare the next question."
        );
      }

      const nextQuestionText = String(nextData.next_question || "").trim();

      if (!nextQuestionText) {
        throw new Error("The AI did not prepare the next question.");
      }

      const duplicate = questions.some(
        (item) =>
          item.trim().toLowerCase() === nextQuestionText.toLowerCase()
      );

      if (duplicate) {
        throw new Error(
          "The AI generated a duplicate question. Please try again."
        );
      }

      setEvaluation(safeEvaluation);
      setEvaluationHistory((previous) => [
        ...previous.filter(
          (item) => item.question !== questions[currentQuestion]
        ),
        {
          question: questions[currentQuestion],
          answer,
          evaluation: safeEvaluation,
        },
      ]);

      setPendingNextQuestion(nextQuestionText);
    } catch (err) {
      console.error("Interview processing error:", err);
      setError(
        err.message || "Unable to process your answer. Please try again."
      );
    } finally {
      setEvaluating(false);
    }
  };

  // =========================================================
  // DOWNLOAD RECORDING
  // =========================================================

  const downloadRecording = () => {
    if (!recordedUrl) {
      return;
    }

    const link = document.createElement("a");

    link.href = recordedUrl;

    link.download = `mock-interview-question-${
      currentQuestion + 1
    }.webm`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  };

  // =========================================================
  // TOGGLE CAMERA
  // =========================================================

  const toggleCamera = async () => {
    if (isRecording) return;

    setError("");

    try {
      if (cameraEnabled) {
        stopCamera();
      } else {
        await ensureCamera();
      }
    } catch (err) {
      console.error("Camera toggle error:", err);
      setError(
        err?.message ||
          "Unable to access the camera. Please allow camera access in Chrome."
      );
    }
  };

  // =========================================================
  // TOGGLE MICROPHONE
  // =========================================================

  const toggleMicrophone = async () => {
    if (isRecording) return;

    setError("");

    try {
      if (micEnabled) {
        stopMicrophone();
      } else {
        await ensureMicrophone();
      }
    } catch (err) {
      console.error("Microphone toggle error:", err);
      setError(
        err?.message ||
          "Unable to access the microphone. Check Chrome and Windows microphone permissions."
      );
    }
  };

  // =========================================================
  // CLOSE
  // =========================================================

  const handleClose = () => {
    stopTimer();
    stopSpeechRecognition();

    // Stop the recorder immediately if it is still active.
    if (recorderRef.current) {
      try {
        if (recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
      } catch (err) {
        console.error("Recorder close error:", err);
      }
      recorderRef.current = null;
    }

    // Release EVERY camera and microphone track.
    [
      cameraStreamRef.current,
      microphoneStreamRef.current,
      recordingStreamRef.current,
    ].forEach((stream) => {
      if (stream) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (err) {
            // ignore cleanup errors
          }
        });
      }
    });

    cameraStreamRef.current = null;
    microphoneStreamRef.current = null;
    recordingStreamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause?.();
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute("src");
      videoRef.current.load?.();
    }

    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }

    setRecordedUrl(null);
    setCameraEnabled(false);
    setMicEnabled(false);
    setIsRecording(false);

    // Give the browser one event-loop turn to release the tracks
    // before the modal is removed from the DOM.
    setTimeout(() => {
      onClose();
    }, 0);
  };

  // =========================================================
  // FINAL INTERVIEW REPORT
  // =========================================================

  if (interviewCompleted) {
    return (
      <div className="mock-interview-overlay">
        <div className="mock-interview-container">
          <div className="mock-header">
            <div>
              <span className="mock-label">INTERVIEW COMPLETE</span>
              <h1>Mock Interview Results</h1>
            </div>
            <button type="button" className="mock-close-button" onClick={handleClose}>✕</button>
          </div>

          <div className="mock-question-section">
            <div className="mock-question-card">
              <div className="mock-question-number">✓</div>
              <h2>You completed all {finalSummary?.totalQuestions || MAX_QUESTIONS} questions.</h2>
            </div>

            <div className="answer-evaluation">
              <h3>📊 Overall Performance</h3>
              <p><strong>Questions:</strong> {finalSummary?.totalQuestions || 0}</p>
              <p><strong>Average Score:</strong> {finalSummary?.averageScore ?? 0}/10</p>

              {finalSummary?.strengths?.length > 0 && (
                <div><strong>💪 Strengths</strong><ul>{finalSummary.strengths.map((item, i) => <li key={i}>{item}</li>)}</ul></div>
              )}

              {finalSummary?.improvements?.length > 0 && (
                <div><strong>🎯 Areas to Improve</strong><ul>{finalSummary.improvements.map((item, i) => <li key={i}>{item}</li>)}</ul></div>
              )}
            </div>

            <div className="next-question-area">
              <button type="button" className="next-question-button" onClick={handleClose}>Close Interview</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // NO QUESTIONS
  // =========================================================

  if (questions.length === 0) {
    return (
      <div className="mock-interview-overlay">
        <div className="mock-interview-container">

          <button
            type="button"
            className="mock-close-button"
            onClick={handleClose}
          >
            ✕
          </button>

          <h2>
            No mock interview questions available.
          </h2>

        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="mock-interview-overlay">

      <div className="mock-interview-container">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mock-header">

          <div>
            <span className="mock-label">
              AI VIDEO INTERVIEW
            </span>

            <h1>Mock Interview</h1>
          </div>

          <button
            type="button"
            className="mock-close-button"
            onClick={handleClose}
          >
            ✕
          </button>

        </div>


        {/* =================================================
            PROGRESS
        ================================================= */}

        <div className="mock-progress-area">

          <div className="mock-progress-top">

            <strong>
              Question {currentQuestion + 1} of {MAX_QUESTIONS}
            </strong>

            <strong>
              {Math.round(
                ((currentQuestion + 1) / MAX_QUESTIONS) * 100
              )}
              %
            </strong>

          </div>

          <div className="mock-progress-bar">

            <div
              className="mock-progress-fill"
              style={{
                width: `${
                  ((currentQuestion + 1) /
                    MAX_QUESTIONS) *
                  100
                }%`,
              }}
            />

          </div>

        </div>


        {/* =================================================
            MAIN INTERVIEW AREA
        ================================================= */}

        <div className="mock-main-grid">

          {/* =================================================
              VIDEO
          ================================================= */}

          <div className="mock-video-section">

            <div className="mock-video-wrapper">

              <video
                ref={videoRef}
                className={`mock-live-video ${
                  cameraEnabled
                    ? ""
                    : "camera-hidden"
                }`}
                autoPlay
                muted
                playsInline
              />

              {!cameraEnabled && (
                <div className="camera-off-message">

                  <div className="camera-off-icon">
                    📷
                  </div>

                  <strong>
                    Camera Off
                  </strong>

                  <p>
                    Enable your camera to show your face.
                  </p>

                </div>
              )}

              {/* REC */}

              {isRecording && (
                <div className="recording-indicator">
                  <span className="recording-dot" />
                  REC
                </div>
              )}

              {/* TIMER */}

              <div
                className={`recording-timer ${
                  timeLeft <= 10 && isRecording
                    ? "timer-warning"
                    : ""
                }`}
              >
                ⏱️ {formatTime(timeLeft)}
              </div>

            </div>


            {/* =================================================
                CONTROLS
            ================================================= */}

            <div className="mock-controls" style={{ position: "relative", zIndex: 50, pointerEvents: "auto" }}>

              <button
                type="button"
                className={`media-button ${
                  cameraEnabled
                    ? "media-enabled"
                    : "media-disabled"
                }`}
                onClick={toggleCamera}
                disabled={isRecording}
              >
                {cameraEnabled
                  ? "📷 Camera On"
                  : "📷 Camera Off"}
              </button>


              <button
                type="button"
                className={`media-button ${
                  micEnabled
                    ? "media-enabled"
                    : "media-disabled"
                }`}
                onClick={toggleMicrophone}
                disabled={isRecording}
              >
                {micEnabled
                  ? "🎙️ Mic On"
                  : "🎙️ Mic Off"}
              </button>


              {!isRecording ? (

                <button
                  type="button"
                  className="record-button"
                  onClick={startRecording}
                >
                  🔴 Start Recording
                </button>

              ) : (

                <button
                  type="button"
                  className="stop-record-button"
                  onClick={stopRecording}
                >
                  ⏹ Stop Recording
                </button>

              )}

            </div>


            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div className="mock-error">
                {error}
              </div>
            )}


            {/* =================================================
                RECORDED VIDEO
            ================================================= */}

            {recordedUrl && recordingFinished && (

              <div className="recorded-section">

                <h3>
                  🎬 Your Recording
                </h3>

                <video
                  className="recorded-video"
                  src={recordedUrl}
                  controls
                  playsInline
                />

                <div className="recording-actions">

                  <button
                    className="play-recording-button"
                    onClick={() => {
                      const video =
                        document.querySelector(
                          ".recorded-video"
                        );

                      if (video) {
                        video.play();
                      }
                    }}
                  >
                    ▶ Play Recording
                  </button>


                  <button
                    className="download-recording-button"
                    onClick={downloadRecording}
                  >
                    ⬇ Download Recording
                  </button>

                </div>

              </div>

            )}

          </div>


          {/* =================================================
              QUESTION
          ================================================= */}

          <div className="mock-question-section">

            <span className="question-label">
              INTERVIEWER QUESTION
            </span>

            <div className="mock-question-card">

              <div className="mock-question-number">
                {currentQuestion + 1}
              </div>

              <h2>
                {question}
              </h2>

            </div>
            {answerText && (
  <div className="answer-transcript">
    <h3>🎤 Your Answer</h3>

    <p>
      {answerText}
    </p>
  </div>

  
)}

{evaluation && (
  <div className="answer-evaluation">
    <h3>🤖 AI Evaluation</h3>

    {evaluation.score !== undefined && (
      <p>
        <strong>Score:</strong>{" "}
        {evaluation.score}/10
      </p>
    )}

    {evaluation.feedback && (
      <p>
        <strong>Feedback:</strong>{" "}
        {evaluation.feedback}
      </p>
    )}

    {evaluation.strengths && (
      <div>
        <strong>Strengths:</strong>
        <ul>
          {Array.isArray(evaluation.strengths)
            ? evaluation.strengths.map(
                (item, index) => (
                  <li key={index}>{item}</li>
                )
              )
            : (
              <li>{evaluation.strengths}</li>
            )}
        </ul>
      </div>
    )}

    {evaluation.improvements && (
      <div>
        <strong>Improvements:</strong>
        <ul>
          {Array.isArray(evaluation.improvements)
            ? evaluation.improvements.map(
                (item, index) => (
                  <li key={index}>{item}</li>
                )
              )
            : (
              <li>{evaluation.improvements}</li>
            )}
        </ul>
      </div>
    )}
  </div>
)}


            {/* =================================================
                HOW TO ANSWER
            ================================================= */}

            <div className="how-to-answer">

              <h3>
                💡 How to answer
              </h3>

              <ul>

                <li>
                  Look at the camera while answering.
                </li>

                <li>
                  Speak clearly and confidently.
                </li>

                <li>
                  Structure your answer logically.
                </li>

                <li>
                  Use examples from your resume or
                  projects when relevant.
                </li>

              </ul>

            </div>


            {/* =================================================
                NEXT QUESTION / COMPLETE
            ================================================= */}

            <div className="next-question-area">

              {!recordingFinished && (
                <p className="next-question-hint">
                  Complete your recording before moving
                  to the next question.
                </p>
              )}

              <button
  className="next-question-button"
  onClick={nextQuestion}
  disabled={
    isRecording ||
    !recordingFinished ||
    evaluating
  }
>
                {evaluating
                  ? "🤖 AI is evaluating..."
                  : pendingNextQuestion
                    ? `Continue to Question ${currentQuestion + 2} →`
                    : currentQuestion + 1 >= MAX_QUESTIONS && evaluation
                      ? "🏁 View Final Report"
                      : currentQuestion + 1 >= MAX_QUESTIONS
                        ? "🤖 Evaluate Final Answer"
                        : "🤖 Evaluate & Prepare Next Question"}
              </button>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default MockInterview;