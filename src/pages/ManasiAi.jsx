

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
  const [authLoading, setAuthLoading] = useState(true);

  // Screening tracking state
  const [quizState, setQuizState] = useState({
    isActive: false,
    currentStep: 0,
    answers: [],
  });

  // Track currently chosen choice before hitting submit
  const [selectedQuizOption, setSelectedQuizOption] = useState(null);

  // New Domain scoring State
  const [scoringState, setScoringState] = useState({
    isActive: false,
    dataset: [],
    currentDomainIdx: 0,
    currentQuestionIdx: 0,
    answers: {}, // Stores: { [domainName]: [score1, score2, ...] }
    selectedRating: null,
  });

  const scrollRef = useRef(null);
  let CHAT_ENDPOINT = "https://manasi-production.up.railway.app/chat";

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, scoringState.isActive]);

  useEffect(() => {
    const fetchUserSession = async () => {
      let resolvedSessionId = "";
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          resolvedSessionId = user.id;
        } else if (typeof crypto !== "undefined" && crypto.randomUUID) {
          resolvedSessionId = crypto.randomUUID();
        } else {
          resolvedSessionId =
            "session_" + Math.random().toString(36).substring(2, 11);
        }
        setSessionId(resolvedSessionId);
      } catch (err) {
        console.error("Error retrieving authentication session data:", err);
      } finally {
        setAuthLoading(false);
      }
    };
    fetchUserSession();
  }, []);

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

    setMessages((prev) =>
      prev.map((msg, idx) =>
        idx === prev.length - 1 ? { ...msg, selectedAnswer: option } : msg,
      ),
    );

    setMessages((prev) => [...prev, { role: "user", content: option }]);

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

        // Transition seamlessly into the new domain assessment scoring
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

    const currentDomainScores = answers[domainName] || [];
    const updatedDomainScores = [...currentDomainScores, rating];

    const updatedAnswers = {
      ...answers,
      [domainName]: updatedDomainScores,
    };

    setTimeout(() => {
      if (currentQuestionIdx + 1 < currentDomain.questions.length) {
        // Move to next question in same domain
        setScoringState((prev) => ({
          ...prev,
          currentQuestionIdx: prev.currentQuestionIdx + 1,
          answers: updatedAnswers,
          selectedRating: null,
        }));
      } else if (currentDomainIdx + 1 < dataset.length) {
        // Move to first question of next domain
        setScoringState((prev) => ({
          ...prev,
          currentDomainIdx: prev.currentDomainIdx + 1,
          currentQuestionIdx: 0,
          answers: updatedAnswers,
          selectedRating: null,
        }));
      } else {
        // Assessment completed -> Aggregate and log data to console
        console.log("--- AI Aggregated Domain Scoring Results ---");

        Object.keys(updatedAnswers).forEach((dName) => {
          const scoresArray = updatedAnswers[dName];
          const rawScore = scoresArray.reduce((sum, val) => sum + val, 0);
          // Max possible score assumes a maximum value of 5 per question
          const maxPossible = scoresArray.length * 5;
          const percentage = Math.round((rawScore / maxPossible) * 100);

          let severity = "Low";
          if (percentage >= 40 && percentage <= 69) severity = "Moderate";
          if (percentage >= 70) severity = "High";

          console.log(`Domain: ${dName}`);
          console.log(` - Raw score: ${rawScore} / ${maxPossible}`);
          console.log(` - Percentage: ${percentage}%`);
          console.log(` - Severity classification: ${severity}`);
        });

        setScoringState((prev) => ({ ...prev, isActive: false }));
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Thank you for completing your cognitive assessment! Your scores have been calculated and compiled successfully.",
          },
        ]);
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

    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
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
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
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

  // Compute metrics for active domain phase template
  const activeDomain = scoringState.dataset[scoringState.currentDomainIdx];
  const totalDomains = scoringState.dataset.length;
  const currentStepNum = scoringState.currentDomainIdx + 1;
  const progressPercent =
    totalDomains > 0 ? (currentStepNum / totalDomains) * 100 : 0;

  return (
    <div className="h-screen w-full text-white ai flex flex-col p-4 md:p-6 select-none manrope overflow-y-scroll mainBox">
      {!hasConversation ? (
        <main className="flex-1 min-h-0 flex flex-col gap-5 md:gap-15 items-center justify-center text-center max-w-3xl w-full mx-auto px-2 mainBox ">
          <div className="text-white/90 opacity-80">
            <img src={ai} alt="Logo" />
          </div>
          <div>
            <p className="text-white/80 text-[13px] md:text-[18px] sm:text-base max-w-sm">
              Hi, I am Manasi!
            </p>
            <h1 className="text-[28px] md:text-[44px] font-normal text-white mt-[20px] tracking-tight leading-[1.2]">
              How can I help
              <br />
              you today?
            </h1>
          </div>
        </main>
      ) : scoringState.isActive ? (
        /* Detailed Questionnaire Assessment Template Panel */
        <main className="flex-1 flex flex-col gap-10 max-w-2xl w-full mx-auto px-2 justify-center ">
          <div className="w-full text-left my-auto">
            <span className=" text-[10px] md:text-[12px] font-semibold uppercase tracking-wider text-white">
              Step {currentStepNum}/{totalDomains}
            </span>
            <h2 className="text-[24px] md:text-[32px] font-medium text-white mt-1 mb-4">
              {activeDomain.domain}
            </h2>

            {/* Step Progress Bar wrapper */}
            <div className="w-full bg-white/20 h-[4px] rounded-full mb-8 overflow-hidden">
              <div
                className="bg-white h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* List containing questions */}
            <div className="flex flex-col gap-3 mb-8">
              {activeDomain.questions.map((qText, qIdx) => {
                const isCurrent = qIdx === scoringState.currentQuestionIdx;
                return (
                  <div
                    key={qIdx}
                    className={`
          relative before:content-['•'] before:font-bold before:pr-2 rounded-[20px] md:rounded-[34px] p-[20px] md:px-5 md:py-[30px] text-[14px] md:text-[15px] font-medium transition-all duration-200
          ${isCurrent ? "bg-white text-[#B05A36] before:text-[#B05A36]" : "bg-white/10 text-white before:text-white"}
        `.trim()}
                  >
                    {qText}
                  </div>
                );
              })}
            </div>

            {/* 1 to 5 Rating Control Node */}
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
                      className="w-12.5 h-12.5 md:w-20 md:h-20 cursor-pointer rounded-[22px] md:rounded-[30px] font-bold flex items-center justify-center transition-all duration-150 font-medium text-[12px]  md:text-[16px]"
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
        /* Conversation layout */
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

                  {/* Interactive Quiz Renderer */}
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
                              className={`font-medium text-[13px] md:text-[15px] px-5 py-2.5 rounded-full transition duration-150 flex items-center gap-1.5 ${
                                isCurrentlySelected || isPastSubmittedOption
                                  ? ""
                                  : "bg-white text-gray-900 hover:bg-opacity-95"
                              } ${!isLastMessage ? "cursor-default" : "cursor-pointer"}`}
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
                          className="w-[18px] h-[18px] rotate-60 brightness-200"
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
                            className="w-[18px] h-[18px] rotate-60 brightness-200"
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

      {/* Input / Quick Action Controls wrapper */}
      <div className="w-full max-w-3xl mx-auto space-y-4 bg-transparent mt-auto sticky bottom-0">
        {!isLoading && !hasConversation && (
          <div className="w-full  flex items-center gap-2 md:overflow-visible overflow-x-auto flex-nowrap md:justify-center pb-2 px-1 scrollbar-none snap-x snap-mandatory">
            <button
              onClick={() => sendMessage("Help me navigate neuroplasticity")}
              className="h-[80px] w-[280px] snap-center shrink-0 flex items-center justify-between px-7 rounded-[34px] text-xs sm:text-sm text-white/90 transition bg-black/11"
            >
              <p className="font-semibold  md:text-[14px] text-left">
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
              className="h-[80px] w-[280px] snap-center shrink-0 flex items-center justify-between px-7 rounded-[34px] text-xs sm:text-sm text-white/90 transition bg-black/11"
            >
              <p className="font-semibold  md:text-[14px] text-left">
                New Therapies
              </p>
              <span className="text-[10px] bg-white rounded-full p-3 flex items-center justify-center">
                <img src={arrow} alt="send" className="rotate-60" />
              </span>
            </button>

            <button
              onClick={() => sendMessage("Give me my personalized roadmap")}
              className="h-[80px] w-[280px] snap-center shrink-0 flex items-center justify-between px-7 rounded-[34px] text-xs sm:text-sm text-white/90 transition bg-black/11"
            >
              {" "}
              <p className="font-semibold  md:text-[14px] text-left">
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
          <div className="w-full rounded-[34px] px-[15px] py-[10px] md:py-4.5 md:pl-[25px] md:px-[15px] max-w-2xl mx-auto bg-white text-gray-900 p-4 shadow-2xl text-left flex justify-between items-center">
            <textarea
              rows="1"
              placeholder="What would you like help with?"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={quizState.isActive || scoringState.isActive}
              className="placeholder:text-black w-full text-[13px] md:text-[18px] font-semibold text-gray-800 bg-transparent resize-none focus:outline-none focus:ring-0 border-none p-0 disabled:opacity-50"
            ></textarea>

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
  );
};

export default ManasiAi;
