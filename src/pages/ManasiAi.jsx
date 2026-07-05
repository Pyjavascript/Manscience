

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

const QUESTIONNAIRE = [
  {
    id: 0,
    question: "When did you first notice these difficulties?",
    options: ["Early Childhood", "Started Recently", "Not Sure"],
  },
  {
    id: 1,
    question: "Have these challenges been present across multiple settings (home, school, work, social situations)?",
    options: ["Yes", "No", "Not Sure"],
  },
  {
    id: 2,
    question: "Did the difficulties begin after an illness, injury, accident, surgery, infection, or major life event?",
    options: ["Yes", "No", "Not Sure"],
  },
  {
    id: 3,
    question: "Has a doctor, psychologist, or therapist ever mentioned autism, ADHD, dyslexia, developmental delay, or another neurodevelopmental condition?",
    options: ["Yes", "No", "Not Sure"],
  }
];

const ManasiAi = () => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  
  // Quiz tracking state
  const [quizState, setQuizState] = useState({
    isActive: false,
    currentStep: 0,
    answers: []
  });
  
  // Track currently chosen choice before hitting submit
  const [selectedQuizOption, setSelectedQuizOption] = useState(null);

  const scrollRef = useRef(null);
  // let CHAT_ENDPOINT = "http://127.0.0.1:8000/chat"; 
  let CHAT_ENDPOINT = "https://manasi-production.up.railway.app/chat"; 


  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const fetchUserSession = async () => {
      let resolvedSessionId = "";
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          resolvedSessionId = user.id;
        } else if (typeof crypto !== "undefined" && crypto.randomUUID) {
          resolvedSessionId = crypto.randomUUID();
        } else {
          resolvedSessionId = "session_" + Math.random().toString(36).substring(2, 11);
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
        selectedAnswer: null // Will track what was picked after submission
      }
    ]);
  };

  const handleQuizAnswerSubmit = (step) => {
    if (!selectedQuizOption) return;
    
    const option = selectedQuizOption;
    setSelectedQuizOption(null); // Reset selection state for next step

    // 1. Update the current active question block in history to lock down the selected answer item
    setMessages((prev) => 
      prev.map((msg, idx) => 
        idx === prev.length - 1 ? { ...msg, selectedAnswer: option } : msg
      )
    );

    // 2. Append standard user message bubble response to layout
    setMessages((prev) => [...prev, { role: "user", content: option }]);
    
    const updatedAnswers = [...quizState.answers, option];
    const nextStep = step + 1;

    if (nextStep < QUESTIONNAIRE.length) {
      setQuizState(prev => ({ ...prev, currentStep: nextStep, answers: updatedAnswers }));
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
            selectedAnswer: null
          }
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
        if (updatedAnswers[2] === "Yes") ntScore++;
        if (updatedAnswers[2] === "No") ntScore++;
        if (updatedAnswers[3] === "Yes") ndScore++;
        if (updatedAnswers[3] === "No") ntScore++;

        const finalStatus = ndScore >= ntScore ? "Neurodivergent" : "Neurotypical";

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Based on your responses, you are likely ${finalStatus}. We are assembling your personalized cognitive roadmap right now.`,
          }
        ]);
      }, 1000);
    }
  };

  const sendMessage = async (textOverride) => {
    const text = (textOverride ?? userInput).trim();
    if (!text || isLoading || authLoading) return;

    if (text === "Give me my personalized roadmap" || text === "Help me navigate neuroplasticity") {
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

  const hasConversation = messages.length > 0;

  return (
    <div
      className="h-screen w-full text-white ai flex flex-col p-4 md:p-6 select-none manrope">
      {!hasConversation ? (
        <main className="flex-1 min-h-0 flex flex-col gap-5 md:gap-15 items-center justify-center text-center max-w-3xl w-full mx-auto px-2 mainBox">
          <div className="text-white/90 opacity-80">
            <img src={ai} alt="Logo" />
          </div>

          <div>
            <h1 className="text-[28px] md:text-[44px] font-normal text-white mb-2 tracking-tight">
              Hi, I am Manasi!
            </h1>
            <p className="text-white/80 text-[13px] md:text-[18px] sm:text-base max-w-sm">
              Here to provide better guidance.
            </p>
          </div>
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

                  {/* Interactive Quiz Renderer */}
                  {msg.isQuiz && (
                    <div className="flex flex-col gap-3 w-full mt-2">
                      <div className="flex flex-wrap gap-2">
                        {msg.options.map((opt, i) => {
  
                          const isCurrentlySelected = isLastMessage && selectedQuizOption === opt;
                          const isPastSubmittedOption = msg.selectedAnswer === opt;

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
                                    : "#111827"
                              }}
                              className={`font-medium text-[13px] md:text-[15px] px-5 py-2.5 rounded-full transition duration-150 flex items-center gap-1.5 ${
                                isCurrentlySelected || isPastSubmittedOption
                                  ? "" 
                                  : "bg-white text-gray-900 hover:bg-opacity-95"
                              } ${!isLastMessage ? "cursor-default" : "cursor-pointer"}`}
                            >
                              {/* 1. Live Choice Checkmark Icon */}
                              {isCurrentlySelected && (
                                <span>
                                  <img src={optionChoose} alt="Selected" className="w-6 h-6" />
                                </span>
                              )}
                              
                             
                              {isPastSubmittedOption && (
                                <span>
                                  <img src={optionMark} alt="Marked" className="w-6 h-6" />
                                </span>
                              )}
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explicit Submit Action Block */}
                      {isLastMessage && selectedQuizOption && (
                        <button
                          onClick={() => handleQuizAnswerSubmit(msg.step)}
                          style={{ backgroundColor: "#84310E" }}
                          className="w-ful text-white font-normal text-[14px] py-3.5 rounded-[24px] transition duration-200 hover:bg-opacity-95 cursor-pointer mt-1"
                        >
                          Submit
                        </button>
                      )}
                    </div>
                  )}

                  {/* standard CTA Links Insertion */}
                  <div className="flex md:flex-row flex-col gap-2">
                    {msg.cta && msg.cta.cta_found && msg.cta.cta_url && (
                      <a
                        href={msg.cta.cta_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 self-start flex items-center gap-2 bg-[#B05A36] text-white font-normal text-[12px] md:text-[14px] px-5 py-3 rounded-full transition w-auto"
                      >
                        <span className="manrope">{msg.cta.cta_trigger || "Learn More"}</span>
                        <img
                          src={inparrow}
                          alt="link"
                          className="w-[18px] h-[18px] rotate-60 brightness-200"
                        />
                      </a>
                    )}
                    {msg.cta && msg.cta.cta_found && msg.cta.cta_category === "Condition" && (
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

      <div className="w-full max-w-3xl mx-auto space-y-4 bg-transparent mt-auto sticky bottom-0">
        {!isLoading && !hasConversation && (
          <div className="w-full flex items-center gap-2 overflow-x-auto flex-nowrap md:justify-center pb-2 px-1 scrollbar-none snap-x snap-mandatory">
            <button
              onClick={() => sendMessage("Help me navigate neuroplasticity")}
              className="snap-center shrink-0 flex items-center justify-between gap-2 px-3.75 py-3 rounded-[20px] text-xs sm:text-sm text-white/90 transition bg-[#B05A36]"
            >
              <div className="flex gap-1.5 items-center">
                <span className="w-4.25 h-4.25 rounded-full">
                  <img src={thunder} alt="icon" />
                </span>
                <p className="font-semibold text-[10px] w-1/2 text-left">
                  Navigate Neuroplasticity
                </p>
              </div>
              <span className="text-[10px] bg-white rounded-full p-2 flex items-center justify-center">
                <img src={arrow} alt="send" className="rotate-60" />
              </span>
            </button>

            <button
              onClick={() => sendMessage("Help me understand therapies")}
              className="snap-center shrink-0 flex items-center justify-between gap-2 px-3.75 py-3 rounded-[20px] text-xs sm:text-sm text-white/90 transition bg-[#B05A36]"
            >
              <div className="flex gap-1.5 items-center">
                <span className="w-4.25 h-4.25 rounded-full">
                  <img src={ball} alt="icon" />
                </span>
                <p className="font-semibold text-[10px] w-1/2 text-left">
                  Understand Therapies
                </p>
              </div>
              <span className="text-[10px] bg-white rounded-full p-2 flex items-center justify-center">
                <img src={arrow} alt="send" className="rotate-60" />
              </span>
            </button>
            
            <button
              onClick={() => sendMessage("Give me my personalized roadmap")}
              className="snap-center shrink-0 flex items-center justify-between gap-2 px-3.75 py-3 rounded-[20px] text-xs sm:text-sm text-white/90 transition bg-[#B05A36]"
            >
              <div className="flex gap-1.5 items-center">
                <span className="w-4.25 h-4.25 rounded-full">
                  <img src={cube} alt="icon" />
                </span>
                <p className="font-semibold text-[10px] w-2/3 text-left">
                  Get your personalized roadmap
                </p>
              </div>
              <span className="text-[10px] bg-white rounded-full p-2 flex items-center justify-center">
                <img src={arrow} alt="send" className="rotate-60" />
              </span>
            </button>
          </div>
        )}

        <div className="w-full rounded-[30px] px-5 py-4.5 md:px-6.25 max-w-2xl mx-auto bg-white text-gray-900 p-4 shadow-2xl text-left">
          <textarea
            rows="1"
            placeholder="What would you like help with?"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={quizState.isActive}
            className="placeholder:text-black w-full text-[18px] font-semibold text-gray-800 bg-transparent resize-none focus:outline-none focus:ring-0 border-none p-0 disabled:opacity-50"
          ></textarea>

          <div className="flex items-center justify-between gap-2 mt-2 pt-2 ">
            <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition font-medium">
              <span className="text-sm font-bold">+</span> Add Files
            </button>

            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !userInput.trim() || quizState.isActive}
              className="w-9 h-9 rounded-full bg-amber-700 hover:bg-amber-800 disabled:bg-amber-700/40 flex items-center justify-center text-white transition shadow-sm"
            >
              <img src={inparrow} alt="send" />
            </button>
          </div>
        </div>

        <footer className="w-full text-center pb-2 pt-1">
          <p className="text-[9px] md:text-[13px] text-white max-w-md mx-auto px-4">
            Manasi AI can make mistakes, kindly consult a certified practitioner.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default ManasiAi;