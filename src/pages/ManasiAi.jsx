import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import ai from "../assets/Ai/ai.svg";
import bg from "../assets/Ai/bg.svg";
import Logo from "../assets/Ai/Logo.svg";

import { supabase } from "../supabase";
import {
  QUESTIONNAIRE,
  ROADMAP_TRIGGER_PHRASES,
  INITIAL_QUIZ_STATE,
  INITIAL_SCORING_STATE,
  SCREENING_COMPLETE_MESSAGE,
  ROADMAP_SUCCESS_MESSAGE,
  ROADMAP_ERROR_MESSAGE,
} from "../components/ManasiAi/constants";
import {
  generateSessionId,
  createUserMessage,
  createQuizMessage,
  withActiveCta,
  classifyScreening,
  buildRoadmapPayload,
} from "../components/ManasiAi/helpers";
import {
  postChatMessage,
  saveChatTurn,
  fetchChatHistory,
  submitRoadmap,
} from "../components/ManasiAi/api";
import { useStableCallback } from "../components/ManasiAi/useStableCallback";
import ChatMessage from "../components/ManasiAi/ChatMessage";
import WelcomeScreen from "../components/ManasiAi/WelcomeScreen";
import RoadmapCompleted from "../components/ManasiAi/RoadmapCompleted";
import DomainScoring from "../components/ManasiAi/DomainScoring";
import ChatComposer from "../components/ManasiAi/ChatComposer";

const CHAT_FADE_MASK =
  "linear-gradient(to bottom, transparent 0%, black 8%, black 88%, transparent 100%)";

const ManasiAi = () => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Sidebar history state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // eslint-disable-line no-unused-vars
  const [sessionsList, setSessionsList] = useState([]); // eslint-disable-line no-unused-vars

  // Initial screening quiz state
  const [quizState, setQuizState] = useState(INITIAL_QUIZ_STATE);
  const [selectedQuizOption, setSelectedQuizOption] = useState(null);

  // Domain scoring state
  const [scoringState, setScoringState] = useState(INITIAL_SCORING_STATE);

  const scrollRef = useRef(null);

  // ---------- Effects ----------

  // Auto-scroll only when new content appears, not on every state update
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

  // Load the logged-in user and start a fresh session
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
        startNewChatSession();
      } catch (err) {
        console.error("Auth context load failure:", err);
      } finally {
        setAuthLoading(false);
      }
    };
    initializeSessionState();
  }, []);

  // ---------- Session & history ----------

  function startNewChatSession() {
    setSessionId(generateSessionId());
    setMessages([]);
    setQuizState(INITIAL_QUIZ_STATE);
    setScoringState(INITIAL_SCORING_STATE);
  }

  async function fetchHistoryRecords(uid) {
    if (!uid) return;
    const records = await fetchChatHistory(uid);
    if (records) setSessionsList(records);
  }

  const saveQuizTurnToHistory = async (question, answer) => {
    try {
      await saveChatTurn({
        sessionId,
        userId: currentUserId,
        question,
        answer,
      });
      if (currentUserId) fetchHistoryRecords(currentUserId);
    } catch (err) {
      console.error("Failed to sync quiz turn to database:", err);
    }
  };

  const addAssistantMessage = (content) =>
    setMessages((prev) => [...prev, { role: "assistant", content }]);

  // ---------- Screening quiz ----------

  const startRoadmapQuiz = (msgIndex = null, ctaText = "Get a Roadmap") => {
    setSelectedQuizOption(null);
    setScoringState((prev) => ({
      ...prev,
      isActive: false,
      isCompleted: false,
    }));
    setQuizState({ ...INITIAL_QUIZ_STATE, isActive: true });

    // Mark the clicked CTA as used, then push the user's choice + first question
    setMessages((prev) => [
      ...withActiveCta(prev, msgIndex, ctaText),
      createUserMessage(ctaText),
      createQuizMessage(0),
    ]);
  };

  const handleQuizAnswerSubmit = (step, selectedOpt) => {
    const option = selectedOpt || selectedQuizOption;
    if (!option) return;

    setSelectedQuizOption(null);
    saveQuizTurnToHistory(QUESTIONNAIRE[step].question, option);

    // Lock the answered question and echo the answer as a user message
    setMessages((prev) => [
      ...prev.map((msg, idx) =>
        idx === prev.length - 1 ? { ...msg, selectedAnswer: option } : msg,
      ),
      createUserMessage(option),
    ]);

    const updatedAnswers = [...quizState.answers, option];
    const nextStep = step + 1;
    setIsLoading(true);

    if (nextStep < QUESTIONNAIRE.length) {
      setQuizState((prev) => ({
        ...prev,
        currentStep: nextStep,
        answers: updatedAnswers,
      }));

      setTimeout(() => {
        setIsLoading(false);
        setMessages((prev) => [...prev, createQuizMessage(nextStep)]);
      }, 600);
    } else {
      setQuizState(INITIAL_QUIZ_STATE);

      setTimeout(() => {
        setIsLoading(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: SCREENING_COMPLETE_MESSAGE,
            cta: {
              cta_found: true,
              cta_category: "StartAssessment",
              dataset: classifyScreening(updatedAnswers),
            },
          },
        ]);
      }, 800);
    }
  };

  // ---------- Domain scoring ----------

  const handleRatingSelect = (rating) => {
    setScoringState((prev) => ({ ...prev, selectedRating: rating }));

    const { dataset, currentDomainIdx, currentQuestionIdx, answers } =
      scoringState;
    const currentDomain = dataset[currentDomainIdx];
    const domainName = currentDomain.domain;
    const updatedAnswers = {
      ...answers,
      [domainName]: [...(answers[domainName] || []), rating],
    };

    saveQuizTurnToHistory(
      `[${domainName}] ${currentDomain.questions[currentQuestionIdx]}`,
      `Severity Rating: ${rating}/5`,
    );

    const hasMoreQuestions =
      currentQuestionIdx + 1 < currentDomain.questions.length;
    const hasMoreDomains = currentDomainIdx + 1 < dataset.length;

    // Short delay so the selected rating is visible before moving on
    setTimeout(() => {
      if (hasMoreQuestions) {
        setScoringState((prev) => ({
          ...prev,
          currentQuestionIdx: prev.currentQuestionIdx + 1,
          answers: updatedAnswers,
          selectedRating: null,
        }));
      } else if (hasMoreDomains) {
        setScoringState((prev) => ({
          ...prev,
          currentDomainIdx: prev.currentDomainIdx + 1,
          currentQuestionIdx: 0,
          answers: updatedAnswers,
          selectedRating: null,
        }));
      } else {
        setScoringState((prev) => ({
          ...prev,
          isActive: false,
          isCompleted: true,
          pendingPayload: buildRoadmapPayload(
            updatedAnswers,
            dataset,
            currentUserId || sessionId,
          ),
        }));
      }
    }, 250);
  };

  const submitFinalRoadmapPayload = async () => {
    if (!scoringState.pendingPayload) return;

    setIsLoading(true);
    try {
      await submitRoadmap(
        scoringState.pendingPayload,
        currentUserId || sessionId,
      );
      addAssistantMessage(ROADMAP_SUCCESS_MESSAGE);
      if (currentUserId) fetchHistoryRecords(currentUserId);
    } catch (err) {
      console.error("Pipeline trace error:", err);
      addAssistantMessage(ROADMAP_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
      setScoringState((prev) => ({
        ...prev,
        isCompleted: false,
        pendingPayload: null,
      }));
    }
  };

  // ---------- Chat ----------

  const sendMessage = async (textOverride) => {
    const text = (textOverride ?? userInput).trim();
    if (!text || isLoading || authLoading) return;

    setUserInput("");

    if (ROADMAP_TRIGGER_PHRASES.includes(text)) {
      startRoadmapQuiz();
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsLoading(true);

    try {
      const data = await postChatMessage({
        message: text,
        sessionId,
        userId: currentUserId,
      });
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
      addAssistantMessage("Something went wrong.");
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

  // ---------- Message handlers (stable so ChatMessage stays memoized) ----------

  const onQuizOptionSelect = useStableCallback((step, opt) => {
    setSelectedQuizOption(opt);
    handleQuizAnswerSubmit(step, opt);
  });

  const onLinkCtaClick = useStableCallback((index, label, url) => {
    setMessages((prev) => [
      ...withActiveCta(prev, index, label),
      createUserMessage(label),
    ]);
    window.open(url, "_blank", "noopener,noreferrer");
  });

  const onRoadmapCtaClick = useStableCallback((index) =>
    startRoadmapQuiz(index, "Get a Roadmap"),
  );

  const onBeginJourneyClick = useStableCallback((index, dataset) => {
    setMessages((prev) => [
      ...withActiveCta(prev, index, "Begin My Journey"),
      createUserMessage("Begin My Journey"),
    ]);
    setScoringState({ ...INITIAL_SCORING_STATE, isActive: true, dataset });
  });

  // ---------- Render ----------

  const hasConversation =
    messages.length > 0 || scoringState.isActive || scoringState.isCompleted;

  const renderMainContent = () => {
    if (!hasConversation) return <WelcomeScreen />;

    if (scoringState.isCompleted) {
      return (
        <RoadmapCompleted
          isLoading={isLoading}
          onSubmit={submitFinalRoadmapPayload}
        />
      );
    }

    if (scoringState.isActive) {
      return (
        <DomainScoring
          scoringState={scoringState}
          onRatingSelect={handleRatingSelect}
          scrollRef={scrollRef}
        />
      );
    }

    return (
      <main
        style={{ WebkitMaskImage: CHAT_FADE_MASK, maskImage: CHAT_FADE_MASK }}
        className="flex-1 md:w-150 overflow-y-auto flex flex-col gap-6 max-w-2xl w-full mx-auto px-3.5 pt-6 pb-4 mainBox will-change-transform transform-gpu"
      >
        {messages.map((msg, index) => {
          const isLastMessage = index === messages.length - 1;
          return (
            <ChatMessage
              key={index}
              msg={msg}
              index={index}
              isLastMessage={isLastMessage}
              selectedQuizOption={isLastMessage ? selectedQuizOption : null}
              onQuizOptionSelect={onQuizOptionSelect}
              onLinkCtaClick={onLinkCtaClick}
              onRoadmapCtaClick={onRoadmapCtaClick}
              onBeginJourneyClick={onBeginJourneyClick}
            />
          );
        })}

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
    );
  };

  return (
    <div
      className="flex flex-col h-dvh w-full text-white select-none manrope overflow-hidden overflow-x-visible relative bg-cover bg-center bg-no-repeat pt-6 md:pt-10"
      style={{ backgroundImage: `url("${bg}")` }}
    >
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="md:absolute pl-5 md:pl-11 pb-2 z-10">
          <img src={Logo} className="w-28.75 md:w-51" alt="Manascience" />
        </div>

        {renderMainContent()}

        {!scoringState.isCompleted && (
          <ChatComposer
            showSuggestions={!isLoading && !hasConversation}
            showInput={!scoringState.isActive}
            userInput={userInput}
            onInputChange={setUserInput}
            onKeyDown={handleKeyDown}
            onSend={sendMessage}
            inputDisabled={quizState.isActive || scoringState.isActive}
            sendDisabled={
              isLoading ||
              !userInput.trim() ||
              quizState.isActive ||
              scoringState.isActive
            }
          />
        )}
      </div>
    </div>
  );
};

export default ManasiAi;
