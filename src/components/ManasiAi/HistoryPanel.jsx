import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LuLogOut,
  LuMessageCircle,
  LuPanelLeftClose,
  LuPlus,
  LuSearch,
} from "react-icons/lu";
import UserImg from "../../assets/profile/user.svg";
import AiIcon from "../../assets/Ai/ai.svg";
import { getConversationTitle, groupConversationsByDay } from "./helpers";

// All sizes in this panel are px, not Tailwind's rem scale, so Webflow's
// 14px/16px <html> font-size doesn't rescale it.

const SIDEBAR_WIDTH = 288;
const PANEL_TRANSITION = { duration: 0.3, ease: [0.22, 1, 0.36, 1] };

const IS_MAC =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

const PanelMessage = ({ children }) => (
  <p className="py-[8px] text-[13px] leading-[1.5] text-[#68270B]/60">{children}</p>
);

// Card pinned to the bottom of the sidebar: avatar, name and email open the
// profile; the icon on the right logs out.
const UserFooter = ({ user, isSignedIn, onOpenProfile, onLogout }) => (
  <div className="shrink-0 flex items-center gap-[4px] p-[8px] rounded-[16px] bg-[#FFFCF7] border border-[#68270B]/10">
    <button
      onClick={onOpenProfile}
      title="Go to profile"
      className="flex-1 min-w-0 flex items-center gap-[10px] p-[2px] rounded-[10px] text-left hover:bg-[#68270B]/5 transition-colors cursor-pointer"
    >
      <img
        src={user?.avatarUrl || UserImg}
        alt=""
        className="w-[36px] h-[36px] rounded-[8px] object-cover bg-[#B77145] shrink-0"
      />
      <span className="flex-1 min-w-0">
        <span className="block truncate text-[13px] font-semibold text-[#68270B] leading-[18px]">
          {/* Profile loads just after sign-in, so only say Guest when signed out */}
          {user?.name || (isSignedIn ? " " : "Guest")}
        </span>
        {user?.email && (
          <span className="block truncate text-[11px] text-[#68270B]/60 leading-[16px]">
            {user.email}
          </span>
        )}
      </span>
    </button>

    {isSignedIn && (
      <button
        onClick={onLogout}
        aria-label="Log out"
        title="Log out"
        className="w-[32px] h-[32px] shrink-0 rounded-[10px] flex items-center justify-center text-[#68270B]/75 hover:text-[#68270B] hover:bg-[#68270B]/8 transition-colors cursor-pointer"
      >
        <LuLogOut className="w-[17px] h-[17px]" />
      </button>
    )}
  </div>
);

// Left sidebar with the user's stored chats grouped by day. Sits beside
// the chat on desktop and slides over it on small screens.
const HistoryPanel = ({
  isOpen,
  onClose,
  conversations,
  isLoading,
  isSignedIn,
  activeSessionId,
  onSelect,
  onNewChat,
  user,
  onOpenProfile,
  onLogout,
}) => {
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);

  // Clear the search whenever the panel closes
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) setQuery("");
  }

  // Ctrl/⌘ + K focuses the search box while the panel is open
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((record) =>
      getConversationTitle(record).toLowerCase().includes(q)
    );
  }, [conversations, query]);

  const renderList = () => {
    // Checked first so the sign-in prompt doesn't flash while auth loads
    if (isLoading && conversations.length === 0) {
      return <PanelMessage>Loading…</PanelMessage>;
    }
    if (!isSignedIn) {
      return <PanelMessage>Sign in to see your past conversations.</PanelMessage>;
    }
    if (conversations.length === 0) {
      return <PanelMessage>No conversations yet.</PanelMessage>;
    }
    if (filtered.length === 0) {
      return <PanelMessage>No chats match “{query.trim()}”.</PanelMessage>;
    }

    // Day groups sit 17px apart; inside a group the label and 36px rows
    // are 4px apart
    return groupConversationsByDay(filtered).map(({ label, items }) => (
      <section key={label} className="flex flex-col gap-[4px]">
        <h3 className="text-[12px] leading-[16px] font-normal text-[#68270B]/60">
          {label}
        </h3>
        {items.map((record) => {
          const title = getConversationTitle(record);
          const isActive = record.session_id === activeSessionId;
          return (
            <button
              key={record.session_id}
              title={title}
              onClick={() => onSelect(record)}
              aria-current={isActive ? "page" : undefined}
              className={`w-full h-[36px] shrink-0 flex items-center gap-[8px] pl-[11px] pr-[12px] rounded-full text-left text-[14px] leading-[20px] transition-colors duration-150 cursor-pointer ${
                isActive
                  ? "bg-[#EDDDC9] text-[#68270B] font-medium"
                  : "text-[#68270B]/80 font-normal hover:bg-[#EDDDC9]/60 hover:text-[#68270B]"
              }`}
            >
              <LuMessageCircle
                className={`w-[16px] h-[16px] shrink-0 ${
                  isActive ? "text-[#68270B]" : "text-[#B77145]"
                }`}
              />
              <span className="flex-1 min-w-0 truncate">{title}</span>
            </button>
          );
        })}
      </section>
    ));
  };

  const totalCount = isSignedIn ? conversations.length : 0;

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <>
          {/* Tap-outside-to-close backdrop on small screens */}
          <motion.div
            key="history-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="md:hidden absolute inset-0 z-30 bg-black/40"
          />

          <motion.aside
            key="history-panel"
            initial={{ width: 0 }}
            animate={{ width: SIDEBAR_WIDTH }}
            exit={{ width: 0 }}
            transition={PANEL_TRANSITION}
            className="absolute md:relative inset-y-0 left-0 z-40 h-full max-w-[85vw] shrink-0 overflow-hidden bg-[#FAF4E8] text-[#68270B] border-r border-[#68270B]/10"
          >
            {/* Fixed width so the contents don't reflow while the width
                animates. Figma: 288 wide, 20px side padding (248 content),
                24px between sections. Gaps tighten on short screens. */}
            <div
              style={{ width: SIDEBAR_WIDTH }}
              className="h-full max-w-[85vw] flex flex-col gap-[24px] px-[20px] pt-[24px] pb-[20px] [@media(max-height:640px)]:gap-[16px] [@media(max-height:640px)]:pt-[16px] [@media(max-height:640px)]:pb-[12px]"
            >
              {/* Brand + collapse */}
              <div className="shrink-0 flex items-center justify-between gap-[8px]">
                <div className="flex items-center gap-[10px] min-w-0">
                  <span className="w-[36px] h-[36px] shrink-0 rounded-[10px] bg-[#B77145] flex items-center justify-center">
                    <img src={AiIcon} alt="" className="h-[20px]" />
                  </span>
                  <h2 className="truncate text-[18px] leading-[24px] font-semibold text-[#68270B]">
                    Manasi AI
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close history"
                  title="Close sidebar"
                  className="w-[32px] h-[32px] -mr-[6px] shrink-0 rounded-[8px] flex items-center justify-center text-[#68270B]/70 hover:text-[#68270B] hover:bg-[#68270B]/8 transition-colors cursor-pointer"
                >
                  <LuPanelLeftClose className="w-[20px] h-[20px]" />
                </button>
              </div>

              {/* New chat + search: 44px pills, 12px apart */}
              <div className="shrink-0 flex flex-col gap-[12px]">
                <button
                  onClick={onNewChat}
                  className="w-full h-[44px] flex items-center justify-center gap-[8px] rounded-full bg-[#68270B] text-[#FAF4E8] text-[15px] leading-[20px] font-medium hover:bg-[#7d3414] transition-colors cursor-pointer"
                >
                  <LuPlus className="w-[18px] h-[18px]" /> New chat
                </button>

                <label className="w-full h-[44px] flex items-center gap-[10px] pl-[16px] pr-[12px] rounded-full bg-[#FFFCF7] border border-[#68270B]/12 focus-within:border-[#68270B]/35 transition-colors cursor-text">
                  <LuSearch className="w-[16px] h-[16px] shrink-0 text-[#68270B]/75" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && setQuery("")}
                    placeholder="Search chats"
                    aria-label="Search chats"
                    className="flex-1 min-w-0 bg-transparent border-none p-0 text-[14px] leading-[20px] text-[#68270B] placeholder:text-[#68270B]/55 focus:outline-none focus:ring-0"
                  />
                 
                </label>
              </div>

              {/* Chat history: heading stays put, the day groups scroll */}
              <div className="flex-1 min-h-0 flex flex-col gap-[17px]">
                <div className="shrink-0 flex items-center gap-[8px]">
                  <h2 className="text-[15px] leading-[20px] font-semibold text-[#68270B]">
                    Chat history
                  </h2>
                  {totalCount > 0 && (
                    <span className="h-[20px] min-w-[24px] px-[8px] flex items-center justify-center rounded-full bg-[#EDDDC9] text-[12px] leading-none font-medium text-[#68270B]/80">
                      {totalCount}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-h-0 flex flex-col gap-[17px] overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:rgba(104,39,11,0.25)_transparent]">
                  {renderList()}
                </div>
              </div>

              <UserFooter
                user={user}
                isSignedIn={isSignedIn}
                onOpenProfile={onOpenProfile}
                onLogout={onLogout}
              />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default HistoryPanel;
