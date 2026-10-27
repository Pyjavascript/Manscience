import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FiClock, FiVideo, FiX } from "react-icons/fi";
import ai from "../assets/Ai/ai.svg";
import Logo from "../assets/Ai/Logo.svg";

import { supabase } from "../supabase";
import { ROADMAP_TRIGGER_PHRASES } from "../components/ManasiAi/constants";
import {
  generateSessionId,
  createUserMessage,
  withActiveCta,
  getRoadmapUrl,
  resolveAiReturnPath,
  historyToMessages,
} from "../components/ManasiAi/helpers";
import {
  postChatMessage,
  fetchChatHistory,
} from "../components/ManasiAi/api";
import { useStableCallback } from "../components/ManasiAi/useStableCallback";
import ChatMessage from "../components/ManasiAi/ChatMessage";
import WelcomeScreen from "../components/ManasiAi/WelcomeScreen";
import ChatComposer from "../components/ManasiAi/ChatComposer";
import PageBackground from "../components/ManasiAi/PageBackground";
import HistoryPanel from "../components/ManasiAi/HistoryPanel";
import TutorialVideoModal from "../components/ManasiAi/TutorialVideoModal";

const CHAT_FADE_MASK =
  "linear-gradient(to bottom, transparent 0%, black 8%, black 88%, transparent 100%)";

const HEADER_BUTTON_CLASS =
  "w-10 h-10 text-[#68270B] hover:opacity-70 flex items-center justify-center transition-opacity duration-150 cursor-pointer";

const isSmallScreen = () => window.matchMedia("(max-width: 767px)").matches;

const ManasiAi = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [returnPath] = useState(() =>
    resolveAiReturnPath(searchParams.get("from")),
  );
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(generateSessionId);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // History panel state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [sessionsList, setSessionsList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const scrollRef = useRef(null);
  // Session a pending reply belongs to, so switching chats mid-reply
  // doesn't drop the answer into the wrong conversation
  const activeSessionRef = useRef(sessionId);

  // ---------- Effects ----------

  // Auto-scroll only when new content appears, not on every state update
  useEffect(() => {
    const scrollTimer = requestAnimationFrame(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => cancelAnimationFrame(scrollTimer);
  }, [messages.length, sessionId]);

  // Track the logged-in user. onAuthStateChange fires straight away with
  // the stored session (no network call, so a slow or failed request can't
  // log the user out), then again on sign-in, sign-out or token refresh.
  useEffect(() => {
    let lastUserId;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setAuthLoading(false);
      if (uid === lastUserId) return;
      lastUserId = uid;
      setCurrentUserId(uid);
      if (uid) fetchHistoryRecords(uid);
      else setSessionsList([]);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ---------- Session & history ----------

  function switchToSession(id, sessionMessages) {
    activeSessionRef.current = id;
    setSessionId(id);
    setMessages(sessionMessages);
    setIsLoading(false);
  }

  function startNewChatSession() {
    switchToSession(generateSessionId(), []);
  }

  async function fetchHistoryRecords(uid) {
    if (!uid) return;
    setHistoryLoading(true);
    const records = await fetchChatHistory(uid);
    if (records) setSessionsList(records);
    setHistoryLoading(false);
  }

  const openHistory = () => {
    setIsHistoryOpen(true);
    if (currentUserId) fetchHistoryRecords(currentUserId);
  };

  const closeHistoryOnSmallScreens = () => {
    if (isSmallScreen()) setIsHistoryOpen(false);
  };

  const handleSelectConversation = (record) => {
    switchToSession(record.session_id, historyToMessages(record));
    setUserInput("");
    closeHistoryOnSmallScreens();
  };

  const handleNewChat = () => {
    startNewChatSession();
    setUserInput("");
    setIsHistoryOpen(false);
  };

  const closeTutorial = useStableCallback(() => setIsTutorialOpen(false));

  // Leave the AI and go back to the page it was opened from
  const closeAiPage = () => window.location.assign(returnPath);

  const addAssistantMessage = (content) =>
    setMessages((prev) => [...prev, { role: "assistant", content }]);

  // The roadmap lives on its own page and returns here when submitted
  const openRoadmapPage = () => navigate(getRoadmapUrl());

  // ---------- Chat ----------

  const sendMessage = async (textOverride) => {
    const text = (textOverride ?? userInput).trim();
    if (!text || isLoading || authLoading) return;

    setUserInput("");

    if (ROADMAP_TRIGGER_PHRASES.includes(text)) {
      openRoadmapPage();
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsLoading(true);
    const requestSessionId = sessionId;

    try {
      const data = await postChatMessage({
        message: text,
        sessionId: requestSessionId,
        userId: currentUserId,
      });
      if (activeSessionRef.current !== requestSessionId) {
        // The user switched chats while waiting; it's saved in history
        if (currentUserId) fetchHistoryRecords(currentUserId);
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer ?? "Sorry, I couldn't get a response.",
          cta: data.cta ?? null,
          responseId: data.response_id ?? null,
        },
      ]);

      if (currentUserId) fetchHistoryRecords(currentUserId);
    } catch (error) {
      console.error("Error:", error);
      if (activeSessionRef.current === requestSessionId) {
        addAssistantMessage("Something went wrong.");
      }
    } finally {
      if (activeSessionRef.current === requestSessionId) setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ---------- Message handlers (stable so ChatMessage stays memoized) ----------

  const onLinkCtaClick = useStableCallback((index, label, url) => {
    setMessages((prev) => [
      ...withActiveCta(prev, index, label),
      createUserMessage(label),
    ]);
    window.open(url, "_blank", "noopener,noreferrer");
  });

  const onRoadmapCtaClick = useStableCallback(openRoadmapPage);

  // ---------- Render ----------

  const hasConversation = messages.length > 0;

  const renderMainContent = () => {
    if (!hasConversation) return <WelcomeScreen />;

    return (
      <main
        style={{ WebkitMaskImage: CHAT_FADE_MASK, maskImage: CHAT_FADE_MASK }}
        className="flex-1 md:w-150 overflow-y-auto flex flex-col gap-6 max-w-2xl w-full mx-auto px-3.5 pt-6 pb-4 mainBox will-change-transform transform-gpu"
      >
        {messages.map((msg, index) => (
          <ChatMessage
            key={`${sessionId}-${index}`}
            msg={msg}
            index={index}
            sessionId={sessionId}
            onLinkCtaClick={onLinkCtaClick}
            onRoadmapCtaClick={onRoadmapCtaClick}
          />
        ))}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, transform: "translateY(10px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
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
    <div className="flex flex-col h-dvh w-full text-white select-none manrope overflow-hidden overflow-x-visible relative isolate pt-6 md:pt-10">
      <PageBackground />
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="md:absolute pl-5 md:pl-11 pb-2 z-10">
          <img src={Logo} className="w-28.75 md:w-51" alt="Manascience" />
        </div>

        {/* Offset so the 40px buttons are centred on the logo's height */}
        <div className="absolute -top-3 md:-top-1.5 right-5 md:right-11 z-20 flex items-center gap-2">
          <button
            onClick={() => setIsTutorialOpen(true)}
            aria-label="How to use Manasi AI"
            title="How to use"
            className={HEADER_BUTTON_CLASS}
          >
            <FiVideo size={19} />
          </button>
          <button
            onClick={openHistory}
            aria-label="Chat history"
            title="History"
            className={HEADER_BUTTON_CLASS}
          >
            <FiClock size={18} />
          </button>
          <button
            onClick={closeAiPage}
            aria-label="Close Manasi AI"
            title="Close"
            className={HEADER_BUTTON_CLASS}
          >
            <FiX size={20} />
          </button>
        </div>

        {renderMainContent()}

        <ChatComposer
          showSuggestions={!isLoading && !hasConversation}
          showInput
          userInput={userInput}
          onInputChange={setUserInput}
          onKeyDown={handleKeyDown}
          onSend={sendMessage}
          inputDisabled={false}
          sendDisabled={isLoading || !userInput.trim()}
        />
      </div>

      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        conversations={sessionsList}
        isLoading={authLoading || historyLoading}
        isSignedIn={!!currentUserId}
        activeSessionId={sessionId}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
      />

      <TutorialVideoModal
        isOpen={isTutorialOpen}
        onClose={closeTutorial}
      />
    </div>
  );
};

export default ManasiAi;
