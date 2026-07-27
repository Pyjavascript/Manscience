import { useState, useRef, useEffect, useMemo } from "react";
import ai from "../assets/Ai/ai.svg";
import bg from "../assets/Ai/bg.svg";
import Logo from "../assets/Ai/Logo.svg";
import arrow from "../assets/Ai/arrow.svg";
import inparrow from "../assets/Ai/inparrow.svg";
import inparrowbrown from "../assets/Ai/inparrowbrown.svg";
import journey from "../assets/Ai/journey.svg";
import sent from "../assets/Ai/sent.svg";
import brainImg from "../assets/Ai/BrainImg.svg";

import { motion, AnimatePresence } from "motion/react";
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

  // Sidebar history state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sessionsList, setSessionsList] = useState([]);

  // Screening tracking state
  const [quizState, setQuizState] = useState({
    isActive: false,
    currentStep: 0,
    answers: [],
  });
  const [selectedQuizOption, setSelectedQuizOption] = useState(null);

  // Domain scoring State
  const [scoringState, setScoringState] = useState({
    isActive: false,
    isCompleted: false, // NEW state to show completion card
    pendingPayload: null, // Holds ready payload until Submit button is clicked
    dataset: [],
    currentDomainIdx: 0,
    currentQuestionIdx: 0,
    answers: {},
    selectedRating: null,
  });

  const scrollRef = useRef(null);
  let CHAT_ENDPOINT = "https://manasi-production.up.railway.app/chat";

  useEffect(() => {
    const scrollTimer = requestAnimationFrame(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => cancelAnimationFrame(scrollTimer);
  }, [messages, isLoading, scoringState.isActive, scoringState.isCompleted]);

  // Handle setting fresh unique session or loaded elements
  useEffect(() => {
    const initializeSessionState = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
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
      isCompleted: false,
      pendingPayload: null,
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

  const startRoadmapQuiz = () => {
    setSelectedQuizOption(null);
    setScoringState((prev) => ({
      ...prev,
      isActive: false,
      isCompleted: false,
    }));
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

  const handleQuizAnswerSubmit = (step, selectedOpt) => {
    const option = selectedOpt || selectedQuizOption;
    if (!option) return;

    setSelectedQuizOption(null);
    const currentQuestionText = QUESTIONNAIRE[step].question;
    saveQuizTurnToHistory(currentQuestionText, option);

    const userMsg = {
      role: "user",
      content: option,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [
      ...prev.map((msg, idx) =>
        idx === prev.length - 1 ? { ...msg, selectedAnswer: option } : msg,
      ),
      userMsg,
    ]);

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
        if (updatedAnswers[1] === "No") ndScore++;
        if (updatedAnswers[2] === "Yes") ndScore++;
        if (updatedAnswers[2] === "No") ndScore++;
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
            content: `Great job! We've completed your initial screening. Based on your responses, we'll now build your personalized Brain Roadmap.`,
            cta: {
              cta_found: true,
              cta_category: "StartAssessment",
              dataset: targetDataset,
            },
          },
        ]);
      }, 800);
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
        // SCORING FINISHED -> CONSTRUCT PAYLOAD & SHOW COMPLETION CARD
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

        // Transition from active scoring to the "Roadmap Completed" screen
        setScoringState((prev) => ({
          ...prev,
          isActive: false,
          isCompleted: true,
          pendingPayload: wireFormatBody,
        }));
      }
    }, 300);
  };

  // Submit trigger fired on "Submit" button click from the Figma card
  const submitFinalRoadmapPayload = () => {
    if (!scoringState.pendingPayload) return;

    setIsLoading(true);
    const wireFormatBody = scoringState.pendingPayload;

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
      .then(() => {
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
        setScoringState((prev) => ({
          ...prev,
          isCompleted: false,
          pendingPayload: null,
        }));

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Thank you for submitting your assessment! Your cognitive profile roadmap has been securely logged and processed. A practitioner will reach out within 3-5 days.",
          },
        ]);
        if (currentUserId) fetchHistoryRecords(currentUserId);
      })
      .catch((err) => {
        console.error("Pipeline trace error:", err);
        setIsLoading(false);
        setScoringState((prev) => ({
          ...prev,
          isCompleted: false,
          pendingPayload: null,
        }));

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "We encountered an issue saving your profile data records. Please try again.",
          },
        ]);
      });
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

    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          user_id: currentUserId,
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

  const hasConversation =
    messages.length > 0 || scoringState.isActive || scoringState.isCompleted;
  const activeDomain = scoringState.dataset[scoringState.currentDomainIdx];
  const totalDomains = scoringState.dataset.length;
  const currentStepNum = scoringState.currentDomainIdx + 1;
  const progressPercent =
    totalDomains > 0 ? (currentStepNum / totalDomains) * 100 : 0;

  const renderedMessages = useMemo(() => {
    return messages.map((msg, index) => {
      const time =
        msg.time ??
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      const isLastMessage = index === messages.length - 1;

      return (
        <motion.div
          key={index}
          layout
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`w-full flex ${
            msg.role === "assistant" ? "justify-start" : "justify-end"
          }`}
        >
          {msg.role === "assistant" ? (
            <div
              className={`flex flex-col items-start gap-3 w-full transition-all duration-200 ${
                msg.isQuiz && msg.options?.some((opt) => opt.length > 15)
                  ? "max-w-[420px]"
                  : "md:max-w-[78%]"
              }`}
            >
              <img src={ai} alt="Manasi" className="w-6 h-6" />

              <div className="text-white bg-[#68270B]/15 font-medium leading-[140%] tracking-[-2%] text-[15px] text-left px-[21px] py-5 rounded-3xl md:rounded-[34px] flex flex-col gap-3 w-full">
                {msg.isQuiz && (
                  <div className="bg-[#D19F8A] py-[13px] px-[15px] flex justify-center items-center gap-[12px] max-w-[105px] rounded-[34px] leading-[1.1] tracking-[-2%]">
                    <div className="bg-white h-[6px] w-[6px] rounded-full"></div>
                    <p className="font-semibold text-[13px]">Roadmap</p>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.content?.trim()}</p>

                {msg.isQuiz &&
                  (() => {
                    const hasLongOption = msg.options.some(
                      (opt) => opt.length > 15,
                    );

                    return (
                      <div
                        className={`flex gap-2 w-full mt-2 ${
                          hasLongOption ? "flex-col" : "flex-row flex-wrap"
                        }`}
                      >
                        {msg.options.map((opt, i) => {
                          const isSelected =
                            (isLastMessage && selectedQuizOption === opt) ||
                            msg.selectedAnswer === opt;

                          return (
                            <button
                              key={i}
                              disabled={!isLastMessage || !!msg.selectedAnswer}
                              onClick={() => {
                                setSelectedQuizOption(opt);
                                handleQuizAnswerSubmit(msg.step, opt);
                              }}
                              className={`font-medium text-[15px] md:text-[17px] px-6 py-3.5 rounded-full transition-all duration-200 flex items-center justify-center gap-2 ${
                                hasLongOption ? "w-full text-center" : "w-[145px]"
                              } ${
                                isSelected
                                  ? "bg-[#68270B] text-white scale-[1.01]"
                                  : "bg-white text-[#68270B] hover:bg-opacity-90 active:scale-95"
                              } ${
                                !isLastMessage || msg.selectedAnswer
                                  ? "cursor-default opacity-80"
                                  : "cursor-pointer"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
              </div>

              {msg.cta && msg.cta.cta_found && (
                <div className="flex flex-wrap gap-2">
                  {msg.cta.cta_url && (
                    <a
                      href={msg.cta.cta_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-[20px] md:gap-[30px] bg-[#68270B] text-white font-medium text-[15px] py-[17px] px-[21px] md:p-[22px] rounded-full transition w-auto cursor-pointer hover:opacity-90 active:scale-95"
                    >
                      <span className="manrope">
                        {msg.cta.cta_trigger || "Learn More"}
                      </span>
                      <img src={inparrow} alt="link" />
                    </a>
                  )}
                  {msg.cta.cta_category === "Condition" && (
                    <button
                      onClick={startRoadmapQuiz}
                      className="flex items-center gap-[20px] md:gap-[30px] bg-[#FAF4E8] text-[#68270B] font-medium text-[15px] py-[17px] px-[21px] md:p-[22px] rounded-full transition w-auto cursor-pointer hover:bg-opacity-90 active:scale-95"
                    >
                      <span className="manrope">Get a Roadmap</span>
                      <img src={inparrowbrown} alt="link" />
                    </button>
                  )}

                  {msg.cta.cta_category === "StartAssessment" && (
                    <button
                      onClick={() => {
                        setScoringState({
                          isActive: true,
                          isCompleted: false,
                          pendingPayload: null,
                          dataset: msg.cta.dataset,
                          currentDomainIdx: 0,
                          currentQuestionIdx: 0,
                          answers: {},
                          selectedRating: null,
                        });
                      }}
                      className="flex items-center gap-[10px] bg-[#68270B] text-white font-medium text-[15px] p-[17px] rounded-full transition cursor-pointer hover:bg-opacity-90 active:scale-95"
                    >
                      <img src={journey} alt="icon" />
                      <span className="manrope">Begin My Journey</span>
                    </button>
                  )}
                </div>
              )}

              <div className="flex gap-[10px] justify-center items-center text-[10px] text-white">
                <p className="font-medium text-[12px]">{time}</p>
                <img src={sent} alt="sent" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-end gap-2 max-w-[85%]">
              <div className="px-[20px] py-[15px] rounded-full font-medium text-[15px] leading-[105%] tracking-[-2%] bg-[#FAF4E8] text-[#68270B] text-left">
                {msg.content}
              </div>
              <div className="flex gap-[10px] justify-center items-center text-[10px] text-white">
                <p className="font-medium text-[12px]">{time}</p>
                <img src={sent} alt="sent" />
              </div>
            </div>
          )}
        </motion.div>
      );
    });
  }, [messages, selectedQuizOption]);

  return (
    <div
      className="flex flex-col h-dvh w-full text-white select-none manrope overflow-hidden relative bg-cover bg-center bg-no-repeat pt-6 md:pt-10"
      style={{ backgroundImage: `url("${bg}")` }}
    >
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="absolute pl-5 md:pl-11 pb-2 z-10">
          <img
            src={Logo}
            className="w-[115px] md:w-[204px]"
            alt="Manascience"
          />
        </div>

        {!hasConversation ? (
          <main className="flex-1 min-h-0 flex flex-col gap-5 md:gap-10 items-center justify-center text-center max-w-3xl w-full mx-auto px-2 mainBox">
            <div>
              <img src={ai} alt="Logo" className="md:h-19.5 h-12.5" />
            </div>

            <div className="flex flex-col justify-center items-center gap-5">
              <h1 className="text-[30px] md:text-[54px] font-normal text-white tracking-tight leading-[1.1]">
                Meet Manasi!
                <br />
                Your AI Brain Guide.
              </h1>
              <p className="text-white text-[15px] md:text-[15px] sm:text-normal max-w-75 md:max-w-xs tracking-tight leading-normal">
                Maanasi translates complex neuroscience into simple,
                personalized guidance.
              </p>
            </div>
          </main>
        ) : scoringState.isCompleted ? (
          <main className="flex-1 min-h-0 flex flex-col justify-center items-center text-center max-w-md w-full mx-auto px-4 my-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full bg-[#68270B]/20 rounded-[40px] p-[10px] text-white flex flex-col items-center gap-[18px] overflow-hidden relative"
            >
              {/* Graphic Banner Area */}
              <div className="w-full flex items-center justify-center relative min-h-[180px]">
                <img
                  src={brainImg}
                  alt="Brain Illustration"
                  className="object-cover"
                />
              </div>

              {/* Text Header Section */}
              <div className="flex flex-col items-center gap-[28px] px-2">
                <div className="flex flex-col items-center gap-[10px]">
                  <span className="text-[16px] font-regular text-white tracking-[2%]">
                    Thank You
                  </span>
                  <h2 className="text-[28px] md:text-[36px] font-medium leading-tight leading-[1.2] text-white tracking-[-3%]">
                    Roadmap Completed!
                  </h2>
                </div>
                <p className="text-[12px] md:text-[14px] text-white leading-[1.3] max-w-[280px] font-normal">
                  Personalised information & Practioners will reach out within
                  3-5days.
                </p>
              </div>

              {/* Submit Action Button */}
              <button
                onClick={submitFinalRoadmapPayload}
                disabled={isLoading}
                className="w-full bg-[#68270B] hover:bg-[#521e08] text-white font-medium py-4 rounded-full text-[16px] md:text-[20px] transition duration-200 active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? "Submitting..." : "Submit"}
              </button>
            </motion.div>
          </main>
        ) : scoringState.isActive ? (
          /* ACTIVE DOMAIN SCORING SCREEN */
          <main className="flex-1 min-h-0 flex flex-col justify-between items-center gap-[25px] text-center max-w-2xl w-full mx-auto px-4 py-2 pt-[30px] md:pt-0 my-auto">
            {/* Step Pill Badge */}
            <div className="flex flex-col items-center gap-[15px] w-full shrink-0">
              <div className="bg-white/10 px-[20px] py-[16px] rounded-full inline-block">
                <span className="text-[15px] font-semibold tracking-wide text-white">
                  Step {currentStepNum}/{totalDomains}
                </span>
              </div>

              {/* Domain Title */}
              <h2 className="text-[24px] md:text-[30px] font-medium text-white tracking-[-4%] leading-[1.2]">
                {activeDomain.domain}
              </h2>

              {/* Progress Bar */}
              <div className="w-full max-w-[320px] md:max-w-[480px] bg-white/20 h-1 rounded-full overflow-hidden mx-auto">
                <div
                  className="bg-white h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* 4-Question Sliding Window Container */}
            <div className="flex flex-col justify-center items-center gap-[10px] w-full max-w-xl my-2 shrink-0 min-h-[320px] justify-center">
              <AnimatePresence mode="popLayout" initial={false}>
                {(() => {
                  const totalQ = activeDomain.questions.length;
                  const currentIdx = scoringState.currentQuestionIdx;

                  let startIndex = 0;
                  if (totalQ <= 4 || currentIdx <= 1) {
                    startIndex = 0;
                  } else if (currentIdx >= totalQ - 2) {
                    startIndex = totalQ - 4;
                  } else {
                    startIndex = currentIdx - 1;
                  }

                  const visibleQuestions = activeDomain.questions.slice(
                    startIndex,
                    startIndex + 4,
                  );

                  return visibleQuestions.map((qText, localIdx) => {
                    const globalIdx = startIndex + localIdx;
                    const isCurrent = globalIdx === currentIdx;

                    return (
                      <motion.div
                        key={qText}
                        layout
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{
                          opacity: isCurrent ? 1 : 0.5,
                          y: 0,
                          scale: isCurrent ? 1.08 : 1,
                        }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{
                          layout: {
                            type: "spring",
                            stiffness: 350,
                            damping: 30,
                          },
                          opacity: { duration: 0.25 },
                          scale: { duration: 0.25 },
                        }}
                        className={`rounded-[22px] h-[80px] w-[310px] md:w-[480px] md:rounded-[28px] flex  items-center px-[30px] text-[13px] md:text-[15px] font-medium text-left transition-colors duration-300 ${
                          isCurrent
                            ? "bg-white text-[#68270B]"
                            : "bg-[#68270B]/20 text-white/70"
                        }`}
                      >
                        Q{globalIdx + 1}. {qText}
                      </motion.div>
                    );
                  });
                })()}
              </AnimatePresence>
            </div>

            {/* Rating Controls Section */}
            <div className="flex flex-col items-center gap-2 shrink-0 w-full">
              <div className="flex justify-center items-center gap-[5px] md:gap-[10px]">
                {[1, 2, 3, 4, 5].map((num) => {
                  const isSelected = scoringState.selectedRating === num;
                  return (
                    <button
                      key={num}
                      onClick={() => handleRatingSelect(num)}
                      className={`w-15 h-15 md:w-20 md:h-20 rounded-full flex items-center justify-center font-semibold text-[15px] md:text-[17px] transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? "bg-[#68270B] text-white scale-105"
                          : "bg-white text-[#68270B] hover:bg-white/90"
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>

              <p className="text-[12px] text-white font-medium">
                Rate from 1-5 based on the severity of your symptoms
              </p>
            </div>

            <div ref={scrollRef} />
          </main>
        ) : (
          /* STANDARD CHAT VIEW */
          <main className="flex-1 overflow-y-auto flex flex-col gap-6 max-w-2xl w-full mx-auto px-2 pt-4 mainBox will-change-transform transform-gpu">
            {renderedMessages}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-start gap-2 max-w-[85%]"
              >
                <img src={ai} alt="Manasi" className="w-6 h-6 animate-pulse" />
                <p className="text-white/80 text-[14px] italic">Thinking...</p>
              </motion.div>
            )}
            <div ref={scrollRef} />
          </main>
        )}

        {/* Form controls section */}
        {!scoringState.isCompleted && (
          <div className="w-full max-w-3xl mx-auto space-y-4 bg-transparent mt-auto sticky bottom-0 p-4">
            {!isLoading && !hasConversation && (
              <div className="w-full flex items-center gap-3.5 md:overflow-visible overflow-x-auto flex-nowrap md:justify-center pb-2 px-1 scrollbar-none snap-x snap-mandatory">
                <button
                  onClick={() => sendMessage("What is ADHD")}
                  className="snap-center shrink-0 flex items-center justify-between gap-2.5 px-6.25 py-5 text-[14px] font-medium md:text-sm text-white/90 transition bg-black/11 rounded-3xl md:rounded-[34px] md:px-9.5 md:py-6.25 cursor-pointer"
                >
                  <p className="md:text-[14px] tracking-[-3%] text-left leading-[1.5]">
                    Explore ADHD
                  </p>
                  <span>
                    <img src={arrow} alt="send" />
                  </span>
                </button>

                <button
                  onClick={() => sendMessage("Help me understand therapies")}
                  className="snap-center shrink-0 flex items-center justify-between gap-[10px] px-[25px] py-[20px] text-[14px] font-medium md:text-sm text-white/90 transition bg-black/11 rounded-3xl md:rounded-[34px] md:px-9.5 md:py-6.25 cursor-pointer"
                >
                  <p className="md:text-[14px] tracking-[-3%] text-left leading-[1.5]">
                    Find Therapies
                  </p>
                  <span>
                    <img src={arrow} alt="send" />
                  </span>
                </button>

                <button
                  onClick={() => sendMessage("Book a session")}
                  className="snap-center shrink-0 flex items-center justify-between gap-[10px] px-[25px] py-[20px] text-[14px] font-medium md:text-sm text-white/90 transition bg-black/11 rounded-3xl md:rounded-[34px] md:px-9.5 md:py-6.25 cursor-pointer"
                >
                  <p className="md:text-[14px] tracking-[-3%] text-left leading-[1.5]">
                    Book Session
                  </p>
                  <span>
                    <img src={arrow} alt="send" />
                  </span>
                </button>
              </div>
            )}
            {!scoringState.isActive && (
              <div className="w-full rounded-[24px] md:rounded-[34px] px-3.75 pr-3 py-2.5 md:py-4.5 md:pl-6.25 md:px-3.75 max-w-2xl mx-auto bg-white text-gray-900 p-4 text-left flex justify-between items-center">
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
                  className="w-11 md:w-[48px] md:h-[45px] h-9.5 rounded-full bg-[#BA5023] hover:bg-amber-800 disabled:bg-amber-700/40 flex items-center justify-center text-white transition"
                >
                  <img
                    src={inparrow}
                    alt="send"
                    className="-rotate-45 h-[12px]"
                  />
                </button>
              </div>
            )}
            {!scoringState.isActive && (
              <footer className="w-full text-center pb-2 pt-1">
                <p className="text-[13px] font-normal md:text-[14px] text-white max-w-md md:max-w-max mx-auto px-4">
                  Manasi AI can make mistakes, kindly consult a certified
                  practitioner.
                </p>
              </footer>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManasiAi;
