import { useState, useRef, useEffect, useMemo } from "react";
import ai from "../assets/Ai/ai.svg";
import bg from "../assets/Ai/bg.svg";
import Logo from "../assets/Ai/Logo.svg";
import arrow from "../assets/Ai/arrow.svg";
import inparrow from "../assets/Ai/inparrow.svg";
import inparrowbrown from "../assets/Ai/inparrowbrown.svg";
import journey from "../assets/Ai/journey.svg";
import journeyWhite from "../assets/Ai/journeyWhite.svg";

import sent from "../assets/Ai/sent.svg";
// import brainImg from "../assets/Ai/BrainImg.svg";

import { motion } from "framer-motion";
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
    isCompleted: false,
    pendingPayload: null,
    dataset: [],
    currentDomainIdx: 0,
    currentQuestionIdx: 0,
    answers: {},
    selectedRating: null,
  });

  const scrollRef = useRef(null);
  const CHAT_ENDPOINT = "https://manasiai-production.up.railway.app/chat";

  // Prevent auto-scroll on every minor state update
  useEffect(() => {
    const scrollTimer = requestAnimationFrame(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => cancelAnimationFrame(scrollTimer);
  }, [
    messages.length,
    quizState.currentStep,
    scoringState.currentDomainIdx,
    scoringState.isCompleted,
  ]);

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
      await fetch("https://manasiai-production.up.railway.app/chat/save_turn", {
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
        `https://manasiai-production.up.railway.app/chat/user/${uid}/history`,
      );
      if (response.ok) {
        const data = await response.json();
        setSessionsList(data.history_records || []);
      }
    } catch (e) {
      console.error("Sidebar update lookup failure:", e);
    }
  };

  const startRoadmapQuiz = (msgIndex = null, ctaText = "Get a Roadmap") => {
    setSelectedQuizOption(null);
    setScoringState((prev) => ({
      ...prev,
      isActive: false,
      isCompleted: false,
    }));
    setQuizState({ isActive: true, currentStep: 0, answers: [] });

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const firstQuestion = QUESTIONNAIRE[0];

    // Mark active CTA on the target message and push user message + first quiz question
    setMessages((prev) => {
      const updated = prev.map((m, idx) =>
        idx === msgIndex ? { ...m, activeCta: ctaText } : m,
      );

      return [
        ...updated,
        {
          role: "user",
          content: ctaText,
          time: time,
        },
        {
          role: "assistant",
          content: firstQuestion.question,
          isQuiz: true,
          options: firstQuestion.options,
          step: 0,
          selectedAnswer: null,
        },
      ];
    });
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

        setScoringState((prev) => ({
          ...prev,
          isActive: false,
          isCompleted: true,
          pendingPayload: wireFormatBody,
        }));
      }
    }, 250);
  };

  const submitFinalRoadmapPayload = () => {
    if (!scoringState.pendingPayload) return;

    setIsLoading(true);
    const wireFormatBody = scoringState.pendingPayload;

    fetch("https://manasiai-production.up.railway.app/roadmap/submit", {
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
          "https://manasiai-production.up.railway.app/roadmap/mapped-therapies",
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
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={` overflow-x-visible flex ${
            msg.role === "assistant" ? "justify-start" : "justify-end"
          }`}
        >
          {msg.role === "assistant" ? (
            (() => {
              const hasLongOption =
                msg.isQuiz && msg.options?.some((opt) => opt.length > 15);

              return (
                <div
                  className={`flex flex-col items-start gap-3 w-full transition-all duration-200 ${
                    hasLongOption ? "max-w-105" : "md:max-w-full"
                  }`}
                >
                
                  <img src={ai} alt="Manasi" className="w-6 h-6" />

                  <div
                    className={`text-white bg-[#68270B]/15 font-medium leading-[140%] tracking-[-2%] text-[15px] text-left px-5.25 py-5 rounded-3xl md:rounded-[34px] flex flex-col gap-3 w-full ${
                      hasLongOption ? "max-w-105" : "w-150"
                    }`}
                  >
                    {msg.isQuiz && (
                      <div className="bg-[#D19F8A] py-3.25 px-3.75 flex justify-center items-center gap-3 max-w-26.25 rounded-[34px] leading-[1.1] tracking-[-2%]">
                        <div className="bg-white h-1.5 w-1.5 rounded-full"></div>
                        <p className="font-semibold text-[13px]">Roadmap</p>
                      </div>
                    )}

                    <p className="whitespace-pre-wrap break-words">
                      {msg.content?.trim()}
                    </p>

                    {/* Quiz Options */}
                    {msg.isQuiz && (
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
                              className={`font-medium text-[15px] md:text-[17px] py-3.5 rounded-full transition-all duration-200 flex items-center justify-center gap-2 ${
                                hasLongOption
                                  ? "w-full text-center"
                                  : "w-25 md:w-36.25"
                              } ${
                                isSelected
                                  ? "bg-[#68270B] text-white"
                                  : "bg-[#FAF4E8] text-[#68270B] hover:bg-opacity-90 active:scale-95"
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
                    )}
                  </div>

                  {/* CTA Section */}
                  {msg.cta && msg.cta.cta_found && !msg.activeCta && (
                    <div className="flex flex-wrap gap-2">
                      {/* 1. External URL CTA */}
                      {msg.cta.cta_url &&
                        (() => {
                          const ctaLabel = msg.cta.cta_trigger || "Learn More";

                          return (
                            <button
                              onClick={() => {
                                const time = new Date().toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                });

                                setMessages((prev) => [
                                  ...prev.map((m, i) =>
                                    i === index
                                      ? { ...m, activeCta: ctaLabel }
                                      : m,
                                  ),
                                  {
                                    role: "user",
                                    content: ctaLabel,
                                    time,
                                  },
                                ]);

                                window.open(
                                  msg.cta.cta_url,
                                  "_blank",
                                  "noopener,noreferrer",
                                );
                              }}
                              className="group flex items-center h-15 gap-5 md:gap-7.5 font-medium text-[15px] py-4.25 px-5.25 md:p-5.5 rounded-full transition-all duration-200 w-auto cursor-pointer active:scale-95 bg-[#FAF4E8] text-[#68270B] hover:bg-[#68270B] hover:text-white"
                            >
                              <span className="manrope">{ctaLabel}</span>
                              <img
                                src={inparrow}
                                alt="link"
                                className="hidden group-hover:block"
                              />
                              <img
                                src={inparrowbrown}
                                alt="link"
                                className="block group-hover:hidden"
                              />
                            </button>
                          );
                        })()}

                      {/* 2. Get a Roadmap CTA */}
                      {msg.cta.cta_category === "Condition" && (
                        <button
                          onClick={() =>
                            startRoadmapQuiz(index, "Get a Roadmap")
                          }
                          className="group flex items-center h-15 gap-5 md:gap-7.5 font-medium text-[15px] py-4.25 px-5.25 md:p-5.5 rounded-full transition-all duration-200 w-auto cursor-pointer active:scale-95 bg-[#FAF4E8] text-[#68270B] hover:bg-[#68270B] hover:text-white"
                        >
                          <span className="manrope">Get a Roadmap</span>
                          <img
                            src={inparrow}
                            alt="link"
                            className="hidden group-hover:block"
                          />
                          <img
                            src={inparrowbrown}
                            alt="link"
                            className="block group-hover:hidden"
                          />
                        </button>
                      )}

                      {/* 3. Begin My Journey Assessment CTA */}
                      {msg.cta.cta_category === "StartAssessment" && (
                        <button
                          onClick={() => {
                            const time = new Date().toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            });

                            setMessages((prev) => [
                              ...prev.map((m, i) =>
                                i === index
                                  ? { ...m, activeCta: "Begin My Journey" }
                                  : m,
                              ),
                              {
                                role: "user",
                                content: "Begin My Journey",
                                time,
                              },
                            ]);

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
                          className="group flex items-center gap-2.5 font-medium text-[15px] p-4.25 rounded-full transition-all duration-200 cursor-pointer active:scale-95 bg-[#FAF4E8] text-[#68270B] hover:bg-[#68270B] hover:text-white"
                        >
                          <img
                            src={journey}
                            alt="icon"
                            className="group-hover:hidden"
                          />
                          <img
                            src={journeyWhite}
                            alt="icon"
                            className="hidden group-hover:block"
                          />
                          <span className="manrope">Begin My Journey</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2.5 justify-center items-center text-[10px] text-white">
                    <p className="font-medium text-[12px]">{time}</p>
                    <img src={sent} alt="sent" />
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="flex flex-col items-end gap-2 max-w-[85%]">
              {/* <div className="px-5 flex justify-center items-center h-15 rounded-full font-medium text-[15px] leading-[105%] tracking-[-2%] bg-[#FAF4E8] text-[#68270B] text-left">
                {msg.content}
              </div> */}
              <div className="px-6 py-4 flex items-center min-h-[60px] rounded-3xl font-medium text-[15px] leading-[140%] bg-[#FAF4E8] text-[#68270B] text-left break-words">
                {msg.content}
              </div>
              <div className="flex gap-2.5 justify-center items-center text-[10px] text-white">
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
      className="flex flex-col h-dvh w-full text-white select-none manrope overflow-hidden overflow-x-visible relative bg-cover bg-center bg-no-repeat pt-6 md:pt-10"
      style={{ backgroundImage: `url("${bg}")` }}
    >
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="md:absolute pl-5 md:pl-11 pb-2 z-10">
          <img src={Logo} className="w-28.75 md:w-51" alt="Manascience" />
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full bg-[#68270B]/20 rounded-[40px] p-2.5 text-white flex flex-col items-center gap-4.5 overflow-hidden relative"
            >
              <div className="w-full flex items-center justify-center relative min-h-45">
                <img
                  src={
                    "https://res.cloudinary.com/dspwbbjyt/image/upload/v1785586774/brainImg_obpn0v.svg"
                  }
                  alt="Brain Illustration"
                  className="object-cover"
                />
              </div>

              <div className="flex flex-col items-center gap-7 px-2">
                <div className="flex flex-col items-center gap-2.5">
                  <span className="text-[16px] font-regular text-white tracking-[2%]">
                    Thank You
                  </span>
                  <h2 className="text-[28px] md:text-[36px] font-medium leading-[1.2] text-white tracking-[-3%]">
                    Roadmap Completed!
                  </h2>
                </div>
                <p className="text-[12px] md:text-[14px] text-white leading-[1.3] max-w-70 font-normal">
                  Personalised information & Practitioners will reach out within
                  3-5days.
                </p>
              </div>

              <button
                onClick={submitFinalRoadmapPayload}
                disabled={isLoading}
                className="w-full bg-[#68270B] hover:bg-[#521e08] text-white font-medium py-4 rounded-full text-[16px] md:text-[20px] transition duration-200 active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? "Submitting" : "Submit"}
              </button>
            </motion.div>
          </main>
        ) : scoringState.isActive ? (
          /* ACTIVE DOMAIN SCORING SCREEN */
          <main className="flex-1 min-h-0 flex flex-col justify-between items-center gap-5 text-center max-w-2xl w-full mx-auto px-4 py-2 pt-7.5 md:pt-0 my-auto">
            {/* Step Pill Badge */}
            <div className="flex flex-col items-center gap-3 w-full shrink-0">
              <div className="bg-white/10 px-5 py-3 rounded-full inline-block">
                <span className="text-[15px] font-semibold tracking-wide text-white">
                  Step {currentStepNum}/{totalDomains}
                </span>
              </div>

              <h2 className="text-[24px] md:text-[30px] font-medium text-white tracking-[-4%] leading-[1.2]">
                {activeDomain.domain}
              </h2>

              <div className="w-full max-w-[320px] md:max-w-120 bg-white/20 h-1 rounded-full overflow-hidden mx-auto">
                <div
                  className="bg-white h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="relative w-full max-w-xl h-82.5 overflow-hidden flex flex-col items-center justify-start my-2 shrink-0">
              {(() => {
                const totalQ = activeDomain.questions.length;
                const currentIdx = scoringState.currentQuestionIdx;

                let topIndex = 0;
                if (totalQ > 4) {
                  if (currentIdx <= 1) {
                    topIndex = 0;
                  } else if (currentIdx >= totalQ - 2) {
                    topIndex = totalQ - 4;
                  } else {
                    topIndex = currentIdx - 1;
                  }
                }

                return (
                  <motion.div
                    animate={{
                      y: -(topIndex * 85),
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="flex flex-col items-center gap-2.5 w-full absolute top-0"
                  >
                    {activeDomain.questions.map((qText, globalIdx) => {
                      const isCurrent = globalIdx === currentIdx;

                      return (
                        <motion.div
                          key={globalIdx}
                          animate={{
                            opacity: isCurrent ? 1 : 0.45,
                            scale: isCurrent ? 1 : 0.96,
                          }}
                          transition={{ duration: 0.2 }}
                          className={`rounded-[22px] h-18.75 w-77.5 md:w-120 md:rounded-[28px] flex items-center px-6 text-[13px] md:text-[15px] font-medium text-left shrink-0 transition-colors duration-200 ${
                            isCurrent
                              ? "bg-white text-[#68270B]"
                              : "bg-[#68270B]/20 text-white/80"
                          }`}
                        >
                          Q{globalIdx + 1}. {qText}
                        </motion.div>
                      );
                    })}
                  </motion.div>
                );
              })()}
            </div>

            {/* Rating Controls Section */}
            <div className="flex flex-col items-center gap-2 shrink-0 w-full">
              <div className="flex justify-center items-center gap-2 md:gap-3">
                {[1, 2, 3, 4, 5].map((num) => {
                  const isSelected = scoringState.selectedRating === num;
                  return (
                    <button
                      key={num}
                      onClick={() => handleRatingSelect(num)}
                      className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center font-semibold text-[15px] md:text-[17px] transition-all duration-150 cursor-pointer ${
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

              <p className="text-[12px] text-white/90 font-medium mt-1">
                Rate from 1-5 based on the severity of your symptoms
              </p>
            </div>

            <div ref={scrollRef} />
          </main>
        ) : (
          /* STANDARD CHAT VIEW */
          <main className="flex-1 md:w-150 overflow-y-auto flex flex-col gap-6 max-w-2xl w-full mx-auto px-3.5 pt-4 mainBox will-change-transform transform-gpu">
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
                  className=" snap-center shrink-0 flex items-center justify-between gap-4.5 px-7.5 py-5 text-[14px] font-medium md:text-sm text-white/90 transition bg-[#68270B]/11 rounded-3xl md:rounded-[34px] md:px-9.5 md:py-6.25 cursor-pointer"
                >
                  <p className="md:text-[14px] tracking-[-3%] text-left leading-normal">
                    Explore ADHD
                  </p>
                  <span>
                    <img src={arrow} alt="send" />
                  </span>
                </button>

                <button
                  onClick={() => sendMessage("Help me understand therapies")}
                  className="snap-center shrink-0 flex items-center justify-between gap-4.5 px-7.5 py-5 text-[14px] font-medium md:text-sm text-white/90 transition bg-[#68270B]/11 rounded-3xl md:rounded-[34px] md:px-9.5 md:py-6.25 cursor-pointer"
                >
                  <p className="md:text-[14px] tracking-[-3%] text-left leading-normal">
                    Find Therapies
                  </p>
                  <span>
                    <img src={arrow} alt="send" />
                  </span>
                </button>

                <button
                  onClick={() => sendMessage("Book a session")}
                  className="snap-center shrink-0 flex items-center justify-between gap-4.5 px-7.5 py-5 text-[14px] font-medium md:text-sm text-white/90 transition bg-[#68270B]/11 rounded-3xl md:rounded-[34px] md:px-9.5 md:py-6.25 cursor-pointer"
                >
                  <p className="md:text-[14px] tracking-[-3%] text-left leading-normal">
                    Book Session
                  </p>
                  <span>
                    <img src={arrow} alt="send" />
                  </span>
                </button>
              </div>
            )}
            {!scoringState.isActive && (
              // <div className="md:w-150 h-15 md:h-20 rounded-3xl md:rounded-[34px] px-3.75 pr-3 py-2.5 md:py-4.5 md:pl-6.25 md:px-3.75 max-w-2xl mx-auto bg-white text-gray-900 p-4 text-left flex justify-between items-center">
              //   <textarea
              //     rows="1"
              //     placeholder="What would you like help with?"
              //     value={userInput}
              //     onChange={(e) => setUserInput(e.target.value)}
              //     onKeyDown={handleKeyDown}
              //     disabled={quizState.isActive || scoringState.isActive}
              //     className="placeholder:text-black w-full text-[13px] md:text-[18px] font-semibold text-gray-800 bg-transparent resize-none focus:outline-none focus:ring-0 border-none p-0 disabled:opacity-50"
              //   />
              <div className="md:w-150 min-h-15 md:min-h-20 rounded-3xl md:rounded-[34px] px-3.75 py-2.5 md:py-4 md:px-6 max-w-2xl mx-auto bg-white text-gray-900 flex justify-between items-center gap-2">
                <textarea
                  rows={1}
                  placeholder="What would you like help with?"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={quizState.isActive || scoringState.isActive}
                  className="placeholder:text-black w-full text-[13px] md:text-[18px] font-semibold text-gray-800 bg-transparent resize-none focus:outline-none focus:ring-0 border-none p-0 max-h-32 overflow-y-auto"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={
                    isLoading ||
                    !userInput.trim() ||
                    quizState.isActive ||
                    scoringState.isActive
                  }
                  className="w-11 md:w-12 md:h-11.25 h-9.5 rounded-full bg-[#B77145] hover:bg-amber-800 disabled:bg-amber-700/40 flex items-center justify-center text-white transition"
                >
                  <img src={inparrow} alt="send" className="-rotate-45 h-3" />
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
