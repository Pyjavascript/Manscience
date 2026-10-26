import { AnimatePresence, motion } from "framer-motion";
import { FiPlus, FiX } from "react-icons/fi";
import { getConversationTitle, groupConversationsByDay } from "./helpers";

const PANEL_TRANSITION = { duration: 0.3, ease: [0.22, 1, 0.36, 1] };

const PanelMessage = ({ children }) => (
  <p className="px-2 py-6 text-center text-[13px] text-[#68270B]/60">{children}</p>
);

// Left "Conversations" panel. Overlays the page (including the logo) and
// lists the user's stored chats grouped by day.
const HistoryPanel = ({
  isOpen,
  onClose,
  conversations,
  isLoading,
  isSignedIn,
  activeSessionId,
  onSelect,
  onNewChat,
}) => {
  const renderList = () => {
    if (!isSignedIn) {
      return <PanelMessage>Sign in to see your past conversations.</PanelMessage>;
    }
    if (isLoading && conversations.length === 0) {
      return <PanelMessage>Loading…</PanelMessage>;
    }
    if (conversations.length === 0) {
      return <PanelMessage>No conversations yet.</PanelMessage>;
    }

    return groupConversationsByDay(conversations).map(({ label, items }) => (
      <section key={label}>
        <h3 className="px-2 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#68270B]/50">
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
              className={`w-full text-left truncate px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors duration-150 cursor-pointer ${
                isActive
                  ? "bg-[#68270B]/10 text-[#68270B] font-semibold"
                  : "text-[#68270B]/80 hover:bg-[#68270B]/6 hover:text-[#68270B]"
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
    <AnimatePresence>
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
            className="md:hidden absolute inset-0 z-30 bg-black/30"
          />

          <motion.aside
            key="history-panel"
            initial={{ opacity: 0, transform: "translateX(-24px)" }}
            animate={{ opacity: 1, transform: "translateX(0px)" }}
            exit={{ opacity: 0, transform: "translateX(-24px)" }}
            transition={PANEL_TRANSITION}
            className="absolute top-3 bottom-3 left-3 z-40 w-72 max-w-[calc(100%-24px)] flex flex-col rounded-[28px] bg-[#faf4e8] text-[#68270B] shadow-2xl ring-1 ring-[#68270B]/10 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <h2 className="text-[16px] font-semibold tracking-[-2%]">
                Conversations
              </h2>
              <button
                onClick={onClose}
                aria-label="Close history"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#68270B]/60 hover:text-[#68270B] hover:bg-[#68270B]/8 transition-colors cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="px-4 pb-2">
              <button
                onClick={onNewChat}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-[#68270B] text-[#FAF4E8] font-semibold text-[14px] py-3 hover:bg-[#7d3414] transition-colors cursor-pointer"
              >
                <FiPlus size={16} /> New chat
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-4 [scrollbar-width:thin] [scrollbar-color:rgba(104,39,11,0.25)_transparent]">
              {renderList()}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default HistoryPanel;
