import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiChevronUp, FiLogOut, FiPlus, FiUser, FiX } from "react-icons/fi";
import UserImg from "../../assets/profile/user.svg";
import { getConversationTitle, groupConversationsByDay } from "./helpers";

const SIDEBAR_WIDTH = 288;
const PANEL_TRANSITION = { duration: 0.3, ease: [0.22, 1, 0.36, 1] };
const MENU_TRANSITION = { duration: 0.15, ease: "easeOut" };

const MENU_ITEM_CLASS =
  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium text-[#68270B] hover:bg-[#68270B]/8 transition-colors cursor-pointer";

const PanelMessage = ({ children }) => (
  <p className="px-3 py-6 text-[13px] text-[#68270B]/60">{children}</p>
);

// Avatar, name and email pinned to the bottom of the sidebar. Opens a small
// menu with links to the profile page and log out.
const UserFooter = ({ user, onOpenProfile, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const footerRef = useRef(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const closeOnOutsideClick = (e) => {
      if (!footerRef.current?.contains(e.target)) setIsMenuOpen(false);
    };
    const closeOnEscape = (e) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMenuOpen]);

  return (
    <div ref={footerRef} className="relative shrink-0 px-4 py-4 border-t border-[#68270B]/10">
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, transform: "translateY(6px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0, transform: "translateY(6px)" }}
            transition={MENU_TRANSITION}
            role="menu"
            className="absolute left-4 right-4 bottom-full mb-2 p-1.5 rounded-2xl bg-white shadow-xl ring-1 ring-[#68270B]/10"
          >
            <button role="menuitem" onClick={onOpenProfile} className={MENU_ITEM_CLASS}>
              <FiUser size={16} /> Go to profile
            </button>
            <button role="menuitem" onClick={onLogout} className={MENU_ITEM_CLASS}>
              <FiLogOut size={16} /> Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsMenuOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        className={`w-full flex items-center gap-3 p-2 rounded-2xl text-left transition-colors cursor-pointer ${
          isMenuOpen ? "bg-[#68270B]/10" : "hover:bg-[#68270B]/6"
        }`}
      >
        <img
          src={user?.avatarUrl || UserImg}
          alt=""
          className="w-11 h-11 rounded-2xl object-cover bg-white shrink-0"
        />
        <span className="flex-1 min-w-0">
          <span className="block truncate text-[15px] font-semibold">
            {user?.name || " "}
          </span>
          {user?.email && (
            <span className="block truncate text-[12px] text-[#68270B]/60">
              {user.email}
            </span>
          )}
        </span>
        <FiChevronUp
          size={18}
          className={`shrink-0 text-[#68270B]/60 transition-transform duration-200 ${
            isMenuOpen ? "" : "rotate-180"
          }`}
        />
      </button>
    </div>
  );
};

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

    return groupConversationsByDay(conversations).map(({ label, items }) => (
      <section key={label}>
        <h3 className="px-3 pt-4 pb-2 text-[12px] font-semibold text-[#68270B]/50">
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
              className={`w-full text-left truncate px-3 py-2.5 rounded-xl text-[14px] transition-colors duration-150 cursor-pointer ${
                isActive
                  ? "bg-[#68270B]/10 text-[#68270B] font-semibold"
                  : "text-[#68270B]/80 font-medium hover:bg-[#68270B]/6 hover:text-[#68270B]"
              }`}
            >
              {title}
            </button>
          );
        })}
      </section>
    ));
  };

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
            {/* Fixed width so the contents don't reflow while the width animates */}
            <div style={{ width: SIDEBAR_WIDTH }} className="h-full max-w-[85vw] flex flex-col">
              <div className="flex items-center justify-between px-5 pt-5 pb-4">
                <h2 className="text-[16px] font-semibold">Conversations</h2>
                <button
                  onClick={onClose}
                  aria-label="Close history"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#68270B]/60 hover:text-[#68270B] hover:bg-[#68270B]/8 transition-colors cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="px-4 pb-3">
                <button
                  onClick={onNewChat}
                  className="w-full flex items-center gap-3 px-5 h-12 rounded-full bg-[#68270B] text-[#FAF4E8] text-[15px] font-semibold hover:bg-[#7d3414] transition-colors cursor-pointer"
                >
                  <FiPlus size={18} /> New chat
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-4 [scrollbar-width:thin] [scrollbar-color:rgba(104,39,11,0.25)_transparent]">
                {renderList()}
              </div>

              <UserFooter user={user} onOpenProfile={onOpenProfile} onLogout={onLogout} />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default HistoryPanel;
