import { useState, useRef, useEffect } from "react";
import ai from "../assets/Ai/ai.svg";
import arrow from "../assets/Ai/arrow.svg";
import thunder from "../assets/Ai/thunder.svg";
import ball from "../assets/Ai/ball.svg";
import cube from "../assets/Ai/cube.svg";
import inparrow from "../assets/Ai/inparrow.svg";
import optionMark from "../assets/Ai/optionMark.svg";
import optionChoose from "../assets/Ai/optionChoose.svg";

import { supabase } from "../supabase";
import { NEUROTYPICAL_SET, NEURODIVERGENT_SET } from "../data/questionnaires";

const QUESTIONNAIRE = [
  {
    id: 0,
    question: "When did you first notice these difficulties?",
    options: ["Early Childhood", "Started Recently", "Not Sure"],
  },
  {
    id: 1,
    question:
      "Have these challenges been present across multiple settings (home, school, work, social situations)?",
    options: ["Yes", "No", "Not Sure"],
  },
  {
    id: 2,
    question:
      "Did the difficulties begin after an illness, injury, accident, surgery, infection, or major life event?",
    options: ["Yes", "No", "Not Sure"],
  },
  {
    id: 3,
    question:
      "Has a doctor, psychologist, or therapist ever mentioned autism, ADHD, dyslexia, developmental delay, or another neurodevelopmental condition?",
    options: ["Yes", "No", "Not Sure"],
  },
];

const ManasiAi = () => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Sidebar history list array and visibility toggle (default closed)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sessionsList, setSessionsList] = useState([]);

  // Screening tracking state
  const [quizState, setQuizState] = useState({
    isActive: false,
    currentStep: 0,
    answers: [],
  });
  const [selectedQuizOption, setSelectedQuizOption] = useState(null);

  // New Domain scoring State
  const [scoringState, setScoringState] = useState({
    isActive: false,
    dataset: [],
    currentDomainIdx: 0,
    currentQuestionIdx: 0,
    answers: {},
    selectedRating: null,
  });

  const scrollRef = useRef(null);
  let CHAT_ENDPOINT = "https://manasi-production.up.railway.app/chat";

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, scoringState.isActive]);

  // Handle setting fresh unique session or loaded elements
  useEffect(() => {
    const initializeSessionState = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          // Load existing session history records
          fetchHistoryRecords(user.id);
        }
        startNewChatSession(user?.id);
      } catch (err) {
        console.error("Auth context load failure:", err);
      } finally {
        setAuthLoading(false);
      }
    };
    initializeSessionState();
  }, []);

  const startNewChatSession = (userId = currentUserId) => {
    let freshSessionId = "";
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      freshSessionId = crypto.randomUUID();
    } else {
      freshSessionId = "session_" + Math.random().toString(36).substring(2, 11);
    }

    setSessionId(freshSessionId);
    setMessages([]);
    setQuizState({ isActive: false, currentStep: 0, answers: [] });
    setScoringState({
      isActive: false,
      dataset: [],
      currentDomainIdx: 0,
      currentQuestionIdx: 0,
      answers: {},
      selectedRating: null,
    });
  };

  const saveQuizTurnToHistory = async (questionText, answerText) => {
    try {
      await fetch("https://manasi-production.up.railway.app/chat/save_turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: currentUserId,
          question: questionText,
          answer: answerText,
        }),
      });
      // Refresh sidebar silently to update logs trace list tracking layout
      if (currentUserId) fetchHistoryRecords(currentUserId);
    } catch (err) {
      console.error("Failed to sync quiz turn to database:", err);
    }
  };
  const fetchHistoryRecords = async (uid) => {
    if (!uid) return;
    try {
      const response = await fetch(
        `https://manasi-production.up.railway.app/chat/user/${uid}/history`,
      );
      if (response.ok) {
        const data = await response.json();
        setSessionsList(data.history_records || []);
      }
    } catch (e) {
      console.error("Sidebar update lookup failure:", e);
    }
  };

  const loadSelectedSession = (selectedSession) => {
    setSessionId(selectedSession.session_id);
    setQuizState({ isActive: false, currentStep: 0, answers: [] });
    setScoringState({
      isActive: false,
      dataset: [],
      currentDomainIdx: 0,
      currentQuestionIdx: 0,
      answers: {},
      selectedRating: null,
    });

    // Format flat array components safely to message tree components
    const mappedMessages = [];
    selectedSession.history.forEach((turn) => {
      if (turn.question)
        mappedMessages.push({ role: "user", content: turn.question });
      if (turn.answer)
        mappedMessages.push({
          role: "assistant",
          content: turn.answer,
          cta: turn.cta,
        });
    });
    setMessages(mappedMessages);
    setIsSidebarOpen(false);
  };

  const startRoadmapQuiz = () => {
    setSelectedQuizOption(null);
    setScoringState((prev) => ({ ...prev, isActive: false }));
    setQuizState({ isActive: true, currentStep: 0, answers: [] });

    const firstQuestion = QUESTIONNAIRE[0];
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: firstQuestion.question,
        isQuiz: true,
        options: firstQuestion.options,
        step: 0,
        selectedAnswer: null,
      },
    ]);
  };

  const handleQuizAnswerSubmit = (step) => {
    if (!selectedQuizOption) return;

    const option = selectedQuizOption;
    setSelectedQuizOption(null);

    // 🌟 SAVE CURRENT STEP TO DATABASE HISTORY HERE
    const currentQuestionText = QUESTIONNAIRE[step].question;
    saveQuizTurnToHistory(currentQuestionText, option);

    setMessages((prev) =>
      prev.map((msg, idx) =>
        idx === prev.length - 1 ? { ...msg, selectedAnswer: option } : msg,
      ),
    );

    const updatedAnswers = [...quizState.answers, option];
    const nextStep = step + 1;

    if (nextStep < QUESTIONNAIRE.length) {
      setQuizState((prev) => ({
        ...prev,
        currentStep: nextStep,
        answers: updatedAnswers,
      }));
      setIsLoading(true);

      setTimeout(() => {
        setIsLoading(false);
        const nextQ = QUESTIONNAIRE[nextStep];
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: nextQ.question,
            isQuiz: true,
            options: nextQ.options,
            step: nextStep,
            selectedAnswer: null,
          },
        ]);
      }, 600);
    } else {
      setQuizState({ isActive: false, currentStep: 0, answers: [] });
      setIsLoading(true);

      setTimeout(() => {
        setIsLoading(false);
        let ndScore = 0;
        let ntScore = 0;

        if (updatedAnswers[0] === "Early Childhood") ndScore++;
        if (updatedAnswers[0] === "Started Recently") ntScore++;
        if (updatedAnswers[1] === "Yes") ndScore++;
        if (updatedAnswers[1] === "No") ntScore++;
        if (updatedAnswers[2] === "Yes") ndScore++;
        if (updatedAnswers[2] === "No") ntScore++;
        if (updatedAnswers[3] === "Yes") ndScore++;
        if (updatedAnswers[3] === "No") ntScore++;

        const finalStatus =
          ndScore >= ntScore ? "Neurodivergent" : "Neurotypical";
        const targetDataset =
          finalStatus === "Neurodivergent"
            ? NEURODIVERGENT_SET
            : NEUROTYPICAL_SET;

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Based on your responses, you are likely ${finalStatus}. We are assembling your personalized cognitive roadmap right now.`,
          },
        ]);

        setTimeout(() => {
          setScoringState({
            isActive: true,
            dataset: targetDataset,
            currentDomainIdx: 0,
            currentQuestionIdx: 0,
            answers: {},
            selectedRating: null,
          });
        }, 1500);
      }, 3000);
    }
  };

  const handleRatingSelect = (rating) => {
  setScoringState((prev) => ({ ...prev, selectedRating: rating }));

  const { dataset, currentDomainIdx, currentQuestionIdx, answers } =
    scoringState;
  const currentDomain = dataset[currentDomainIdx];
  const domainName = currentDomain.domain;
  const currentQuestionText = currentDomain.questions[currentQuestionIdx];

  const currentDomainScores = answers[domainName] || [];
  const currentType = currentDomain.type || "None";
  const updatedDomainScores = [...currentDomainScores, rating];

  const updatedAnswers = { ...answers, [domainName]: updatedDomainScores };

  saveQuizTurnToHistory(
    `[${domainName}] ${currentQuestionText}`,
    `Severity Rating: ${rating}/5`,
  );

  setTimeout(() => {
    if (currentQuestionIdx + 1 < currentDomain.questions.length) {
      setScoringState((prev) => ({
        ...prev,
        currentQuestionIdx: prev.currentQuestionIdx + 1,
        answers: updatedAnswers,
        selectedRating: null,
      }));
    } else if (currentDomainIdx + 1 < dataset.length) {
      setScoringState((prev) => ({
        ...prev,
        currentDomainIdx: prev.currentDomainIdx + 1,
        currentQuestionIdx: 0,
        answers: updatedAnswers,
        selectedRating: null,
      }));
    } else {
      const targetClassification =
        scoringState.dataset === NEURODIVERGENT_SET ? "ND" : "NT";

      const scorePayloadArray = Object.keys(updatedAnswers).map((dName) => {
        const scoresArray = updatedAnswers[dName];
        const rawScore = scoresArray.reduce((sum, val) => sum + val, 0);
        const maxPossible = scoresArray.length * 5;
        const percentage = Math.round((rawScore / maxPossible) * 100);

        let calculatedSeverity = "Low";
        if (percentage >= 40 && percentage <= 69)
          calculatedSeverity = "Moderate";
        if (percentage >= 70) calculatedSeverity = "High";

        const originalDomainObj = scoringState.dataset.find(
          (item) => item.domain === dName,
        );
        const currentEntryType = originalDomainObj?.type || null;

        return {
          domain: dName,
          domain_type: currentEntryType,
          Score: percentage,
          Severity: calculatedSeverity,
        };
      });

      const wireFormatBody = {
        user_id: currentUserId || sessionId,
        Classification: targetClassification,
        score: scorePayloadArray,
      };

      setScoringState((prev) => ({ ...prev, isActive: false }));
      setIsLoading(true);

      // PIPELINE STEP 1: Submit base questionnaire configurations
      fetch("https://manasi-production.up.railway.app/roadmap/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wireFormatBody),
      })
        .then((res) => {
          if (!res.ok)
            throw new Error("Base database roadmap submission failed.");
          return res.json();
        })
        .then((submitDbData) => {
          // PIPELINE STEP 2: Fetch mapped therapies
          return fetch(
            "https://manasi-production.up.railway.app/roadmap/mapped-therapies",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify(wireFormatBody),
            },
          );
        })
        .then((res) => {
          if (!res.ok)
            throw new Error(
              `Therapy API rejected request with status: ${res.status}`,
            );
          return res.json();
        })
        .then((therapyData) => {
          console.log(
            "Step 2 Success — Mapped Therapies payload received:",
            therapyData,
          );

          // Save both mapped_domains and aggregated_therapies to Supabase
          return supabase.from("user_roadmap_mapped").upsert({
            user_id: currentUserId || sessionId,
            classification: therapyData.classification,
            mapped_domains: therapyData.mapped_domains,
            aggregated_therapies: therapyData.aggregated_therapies || [],
            updated_at: new Date().toISOString(),
          });
        })
        .then(({ error: supabaseError }) => {
          if (supabaseError) throw supabaseError;

          setIsLoading(false);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Thank you for completing your assessment! Your cognitive profile roadmap has been securely logged and processed.",
            },
          ]);
          if (currentUserId) fetchHistoryRecords(currentUserId);
        })
        .catch((err) => {
          console.error("Pipeline trace error:", err);
          setIsLoading(false);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Your assessment completed, but we encountered an issue saving or processing your profile data records.",
            },
          ]);
        });
    }
  }, 400);
};

  const sendMessage = async (textOverride) => {
    const text = (textOverride ?? userInput).trim();
    if (!text || isLoading || authLoading) return;

    if (
      text === "Give me my personalized roadmap" ||
      text === "Help me navigate neuroplasticity"
    ) {
      setUserInput("");
      startRoadmapQuiz();
      return;
    }

    const userMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");
    setIsLoading(true);
    console.log("Sending message to backend:", {
      text,
      sessionId,
      currentUserId,
    });

    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          user_id: currentUserId, // Pass the user ID down here!
        }),
      });

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer ?? "Sorry, I couldn't get a response.",
          cta: data.cta ?? null,
        },
      ]);

      // Refresh the sidebar instantly to display the new valid chat
      if (currentUserId) fetchHistoryRecords(currentUserId);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const hasConversation = messages.length > 0 || scoringState.isActive;
  const activeDomain = scoringState.dataset[scoringState.currentDomainIdx];
  const totalDomains = scoringState.dataset.length;
  const currentStepNum = scoringState.currentDomainIdx + 1;
  const progressPercent =
    totalDomains > 0 ? (currentStepNum / totalDomains) * 100 : 0;

  return (
    <div className="flex h-screen w-full text-white ai select-none manrope overflow-hidden relative">
      {/* Dynamic Slide-Out Drawer Panel (ChatGPT style history panel) */}
      <div
        className={`fixed top-0 left-0 h-full w-64 
          bg-black border-r border-white/10 z-50 transform transition-transform duration-300 ease-in-out flex flex-col p-4 ${
            isSidebarOpen
              ? "translate-x-0 opacity-100 visible"
              : "-translate-x-full opacity-0 invisible"
          }`}
        style={{
          // Inline style safety layer to force override Webflow container defaults if needed
          transform: isSidebarOpen ? "translateX(0)" : "translateX(-100%)",
          visibility: isSidebarOpen ? "visible" : "hidden",
        }}
      >
        <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
          <h3 className="font-semibold text-sm text-white/80">Chat History</h3>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="text-white/60 text-xs hover:text-white cursor-pointer px-2 py-1 bg-white/5 rounded"
          >
            ✕
          </button>
        </div>
        <button
          onClick={() => {
            startNewChatSession();
            setIsSidebarOpen(false);
          }}
          className="w-full py-2.5 mb-4 bg-amber-700/30 border border-amber-700 hover:bg-amber-700 text-xs rounded-xl font-medium transition cursor-pointer text-center"
        >
          + New Window / Clear
        </button>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-none">
          {sessionsList.map((s, idx) => (
            <div
              key={idx}
              onClick={() => loadSelectedSession(s)}
              className={`p-3 rounded-xl text-xs text-left truncate cursor-pointer transition ${s.session_id === sessionId ? "bg-amber-700 text-white font-medium" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
            >
              {s.title || "Untitled Conversation"}
            </div>
          ))}
          {sessionsList.length === 0 && (
            <p className="text-[11px] text-white/30 text-center pt-8">
              No conversation items saved.
            </p>
          )}
        </div>
      </div>
      {/* Main Container Layout */}
      <div className="flex-1 flex flex-col h-full mainBox overflow-y-scroll relative">
        {/* Top Floating Control Bar */}
        <div className="w-full flex items-center justify-between p-4 sticky top-0 z-40 bg-transparent">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-full transition cursor-pointer flex items-center gap-1.5"
          >
            ☰ <span>History Logs</span>
          </button>
        </div>

        {!hasConversation ? (
          <main className="flex-1 min-h-0 flex flex-col gap-5 md:gap-15 items-center justify-center text-center max-w-3xl w-full mx-auto px-2 mainBox">
            <div className="text-white/90 opacity-80">
              <img src={ai} alt="Logo" />
            </div>
            <div>
              <p className="text-white/80 text-[13px] md:text-[18px] sm:text-base max-w-sm">
                Hi, I am Manasi!
              </p>
              <h1 className="text-[28px] md:text-[44px] font-normal text-white mt-5 tracking-tight leading-[1.2]">
                How can I help
                <br />
                you today?
              </h1>
            </div>
          </main>
        ) : scoringState.isActive ? (
          <main className="flex-1 flex flex-col gap-10 max-w-2xl w-full mx-auto px-2 justify-center">
            <div className="w-full text-left my-auto">
              <span className="text-[10px] md:text-[12px] font-semibold uppercase tracking-wider text-white">
                Step {currentStepNum}/{totalDomains}
              </span>
              <h2 className="text-[24px] md:text-[32px] font-medium text-white mt-1 mb-4">
                {activeDomain.domain}
              </h2>
              <div className="w-full bg-white/20 h-1 rounded-full mb-8 overflow-hidden">
                <div
                  className="bg-white h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex flex-col gap-3 mb-8">
                {activeDomain.questions.map((qText, qIdx) => {
                  const isCurrent = qIdx === scoringState.currentQuestionIdx;
                  return (
                    <div
                      key={qIdx}
                      className={`relative before:content-['•'] before:font-bold before:pr-2 rounded-[20px] md:rounded-[34px] p-5 md:px-5 md:py-7.5 text-[14px] md:text-[15px] font-medium transition-all duration-200 ${isCurrent ? "bg-white text-[#B05A36] before:text-[#B05A36]" : "bg-white/10 text-white before:text-white"}`.trim()}
                    >
                      {qText}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col items-center gap-2 mt-4">
                <div className="flex justify-between items-center w-full max-w-md gap-2">
                  {[1, 2, 3, 4, 5].map((num) => {
                    const isSelected = scoringState.selectedRating === num;
                    return (
                      <button
                        key={num}
                        onClick={() => handleRatingSelect(num)}
                        style={{
                          background: isSelected ? "#B05A36" : "#FFFFFF",
                          color: isSelected ? "#FFFFFF" : "#B05A36",
                        }}
                        className="w-12.5 h-12.5 md:w-20 md:h-20 cursor-pointer rounded-[22px] md:rounded-[30px] flex items-center justify-center transition-all duration-150 font-medium text-[12px] md:text-[16px]"
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-white/50 font-medium my-4">
                  Rate from 1-5 based on the severity of your symptoms
                </p>
              </div>
            </div>
            <div ref={scrollRef} />
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto flex flex-col gap-6 max-w-2xl w-full mx-auto px-2 pt-4 mainBox">
            {messages.map((msg, index) => {
              const time =
                msg.time ??
                new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
              const isLastMessage = index === messages.length - 1;

              return msg.role === "assistant" ? (
                <div
                  key={index}
                  className="flex flex-col items-start gap-3 max-w-[85%]"
                >
                  <img src={ai} alt="Manasi" className="w-6 h-6" />
                  <div className="text-white bg-white/10 text-[15px] leading-relaxed text-left px-4 py-3 rounded-[30px] flex flex-col gap-3 w-full">
                    <p>{msg.content}</p>
                    {msg.isQuiz && (
                      <div className="flex flex-col gap-3 w-full mt-2">
                        <div className="flex flex-wrap gap-2">
                          {msg.options.map((opt, i) => {
                            const isCurrentlySelected =
                              isLastMessage && selectedQuizOption === opt;
                            const isPastSubmittedOption =
                              msg.selectedAnswer === opt;
                            return (
                              <button
                                key={i}
                                disabled={!isLastMessage}
                                onClick={() => setSelectedQuizOption(opt)}
                                style={{
                                  backgroundColor: isCurrentlySelected
                                    ? "#B05A36"
                                    : isPastSubmittedOption
                                      ? "#FDF6F0"
                                      : "white",
                                  color: isCurrentlySelected
                                    ? "white"
                                    : isPastSubmittedOption
                                      ? "#B05A36"
                                      : "#111827",
                                }}
                                className={`font-medium text-[13px] md:text-[15px] px-5 py-2.5 rounded-full transition duration-150 flex items-center gap-1.5 ${isCurrentlySelected || isPastSubmittedOption ? "" : "bg-white text-gray-900 hover:bg-opacity-95"} ${!isLastMessage ? "cursor-default" : "cursor-pointer"}`}
                              >
                                {isCurrentlySelected && (
                                  <span>
                                    <img
                                      src={optionChoose}
                                      alt="Selected"
                                      className="w-6 h-6"
                                    />
                                  </span>
                                )}
                                {isPastSubmittedOption && (
                                  <span>
                                    <img
                                      src={optionMark}
                                      alt="Marked"
                                      className="w-6 h-6"
                                    />
                                  </span>
                                )}
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {isLastMessage && selectedQuizOption && (
                          <button
                            onClick={() => handleQuizAnswerSubmit(msg.step)}
                            style={{ backgroundColor: "#84310E" }}
                            className="w-full text-white font-normal text-[14px] py-3.5 rounded-3xl transition duration-200 hover:bg-opacity-95 cursor-pointer mt-1"
                          >
                            Submit
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex md:flex-row flex-col gap-2">
                      {msg.cta && msg.cta.cta_found && msg.cta.cta_url && (
                        <a
                          href={msg.cta.cta_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 self-start flex items-center gap-2 bg-[#B05A36] text-white font-normal text-[12px] md:text-[14px] px-5 py-3 rounded-full transition w-auto"
                        >
                          <span className="manrope">
                            {msg.cta.cta_trigger || "Learn More"}
                          </span>
                          <img
                            src={inparrow}
                            alt="link"
                            className="w-4.5 h-4.5 rotate-60 brightness-200"
                          />
                        </a>
                      )}
                      {msg.cta &&
                        msg.cta.cta_found &&
                        msg.cta.cta_category === "Condition" && (
                          <button
                            onClick={startRoadmapQuiz}
                            className="mt-2 self-start flex items-center gap-2 bg-[#B05A36] text-white font-normal text-[12px] md:text-[14px] px-5 py-3 rounded-full transition w-auto cursor-pointer"
                          >
                            <span className="manrope">Get a Roadmap</span>
                            <img
                              src={inparrow}
                              alt="link"
                              className="w-4.5 h-4.5 rotate-60 brightness-200"
                            />
                          </button>
                        )}
                    </div>
                  </div>
                  <span className="text-[10px] text-white/50">{time} ✓✓</span>
                </div>
              ) : (
                <div
                  key={index}
                  className="flex flex-col items-end gap-2 self-end max-w-[85%]"
                >
                  <div className="px-4 py-3 rounded-full text-sm leading-relaxed bg-[#B05A36] text-white text-left">
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-white/50">{time} ✓✓</span>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex flex-col items-start gap-2 max-w-[85%]">
                <img src={ai} alt="Manasi" className="w-6 h-6" />
                <p className="text-white text-[15px]">Thinking...</p>
              </div>
            )}
            <div ref={scrollRef} />
          </main>
        )}

        {/* Form controls section */}
        <div className="w-full max-w-3xl mx-auto space-y-4 bg-transparent mt-auto sticky bottom-0 p-4">
          {!isLoading && !hasConversation && (
            <div className="w-full flex items-center gap-2 md:overflow-visible overflow-x-auto flex-nowrap md:justify-center pb-2 px-1 scrollbar-none snap-x snap-mandatory">
              <button
                onClick={() => sendMessage("Help me navigate neuroplasticity")}
                className="h-20 w-70 snap-center shrink-0 flex items-center justify-between px-7 rounded-[34px] text-xs sm:text-sm text-white/90 transition bg-black/11"
              >
                <p className="font-semibold md:text-[14px] text-left">
                  Top recommended blogs
                  <br />
                  related Neuroplasticity.
                </p>
                <span className="text-[10px] bg-white rounded-full p-3 flex items-center justify-center">
                  <img src={arrow} alt="send" className="rotate-60" />
                </span>
              </button>
              <button
                onClick={() => sendMessage("Help me understand therapies")}
                className="h-20 w-70 snap-center shrink-0 flex items-center justify-between px-7 rounded-[34px] text-xs sm:text-sm text-white/90 transition bg-black/11"
              >
                <p className="font-semibold md:text-[14px] text-left">
                  New Therapies
                </p>
                <span className="text-[10px] bg-white rounded-full p-3 flex items-center justify-center">
                  <img src={arrow} alt="send" className="rotate-60" />
                </span>
              </button>
              <button
                onClick={() => sendMessage("Give me my personalized roadmap")}
                className="h-20 w-70 snap-center shrink-0 flex items-center justify-between px-7 rounded-[34px] text-xs sm:text-sm text-white/90 transition bg-black/11"
              >
                <p className="font-semibold md:text-[14px] text-left">
                  Top recommended blogs
                  <br />
                  related Neuroplasticity.
                </p>
                <span className="text-[10px] bg-white rounded-full p-3 flex items-center justify-center">
                  <img src={arrow} alt="send" className="rotate-60" />
                </span>
              </button>
            </div>
          )}
          {!scoringState.isActive && (
            <div className="w-full rounded-[34px] px-3.75 py-2.5 md:py-4.5 md:pl-6.25 md:px-3.75 max-w-2xl mx-auto bg-white text-gray-900 p-4 shadow-2xl text-left flex justify-between items-center">
              <textarea
                rows="1"
                placeholder="What would you like help with?"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={quizState.isActive || scoringState.isActive}
                className="placeholder:text-black w-full text-[13px] md:text-[18px] font-semibold text-gray-800 bg-transparent resize-none focus:outline-none focus:ring-0 border-none p-0 disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage()}
                disabled={
                  isLoading ||
                  !userInput.trim() ||
                  quizState.isActive ||
                  scoringState.isActive
                }
                className="w-11 md:w-10 h-9.5 rounded-full bg-amber-700 hover:bg-amber-800 disabled:bg-amber-700/40 flex items-center justify-center text-white transition shadow-sm"
              >
                <img src={inparrow} alt="send" />
              </button>
            </div>
          )}
          {!scoringState.isActive && (
            <footer className="w-full text-center pb-2 pt-1">
              <p className="text-[9px] md:text-[13px] text-white max-w-md mx-auto px-4">
                Manasi AI can make mistakes, kindly consult a certified
                practitioner.
              </p>
            </footer>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManasiAi;
