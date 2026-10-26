import { memo } from "react";
import { motion } from "framer-motion";
import ai from "../../assets/Ai/ai.svg";
import sent from "../../assets/Ai/sent.svg";
import inparrow from "../../assets/Ai/inparrow.svg";
import inparrowbrown from "../../assets/Ai/inparrowbrown.svg";
import { getCurrentTime } from "./helpers";

const MessageTime = ({ time }) => (
  <div className="flex gap-2.5 justify-center items-center text-[10px] text-white">
    <p className="font-medium text-[12px]">{time}</p>
    <img src={sent} alt="sent" />
  </div>
);

const CtaArrowButton = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="group flex items-center h-15 gap-5 md:gap-7.5 font-medium text-[15px] py-4.25 px-5.25 md:p-5.5 rounded-full transition-all duration-200 w-auto cursor-pointer active:scale-95 bg-[#FAF4E8] text-[#68270B] hover:bg-[#68270B] hover:text-white"
  >
    <span className="manrope">{label}</span>
    <img src={inparrow} alt="link" className="hidden group-hover:block" />
    <img src={inparrowbrown} alt="link" className="block group-hover:hidden" />
  </button>
);

const AssistantMessage = ({
  msg,
  index,
  time,
  onLinkCtaClick,
  onRoadmapCtaClick,
}) => {
  const showCtas = msg.cta && msg.cta.cta_found && !msg.activeCta;

  return (
    <div className="flex flex-col items-start gap-3 w-full transition-all duration-200 md:max-w-full">
      <img src={ai} alt="Manasi" className="w-6 h-6" />

      <div className="text-white bg-[#68270B]/15 font-medium leading-[140%] tracking-[-2%] text-[15px] text-left px-5.25 py-5 rounded-3xl md:rounded-[34px] flex flex-col gap-3 w-full w-150">
        <p className="whitespace-pre-wrap wrap-break-word">
          {msg.content?.trim()}
        </p>
      </div>

      {showCtas && (
        <div className="flex flex-wrap gap-2">
          {/* 1. External URL CTA */}
          {msg.cta.cta_url && (
            <CtaArrowButton
              label={msg.cta.cta_trigger || "Learn More"}
              onClick={() =>
                onLinkCtaClick(
                  index,
                  msg.cta.cta_trigger || "Learn More",
                  msg.cta.cta_url,
                )
              }
            />
          )}

          {/* 2. Get a Roadmap CTA (opens the roadmap page) */}
          {msg.cta.cta_category === "Condition" && (
            <CtaArrowButton
              label="Get a Roadmap"
              onClick={() => onRoadmapCtaClick(index)}
            />
          )}
        </div>
      )}

      <MessageTime time={time} />
    </div>
  );
};

const UserMessage = ({ msg, time }) => (
  <div className="flex flex-col items-end gap-2 max-w-[85%]">
    <div className="px-6 py-4 flex items-center min-h-15 rounded-3xl font-medium text-[15px] leading-[140%] bg-[#FAF4E8] text-[#68270B] text-left wrap-break-word">
      {msg.content}
    </div>
    <MessageTime time={time} />
  </div>
);

// Memoized so only messages whose props change re-render
const ChatMessage = memo((props) => {
  const { msg } = props;
  const time = msg.time ?? getCurrentTime();
  const isAssistant = msg.role === "assistant";

  return (
    <motion.div
      initial={{ opacity: 0, transform: "translateY(15px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={` overflow-x-visible flex ${
        isAssistant ? "justify-start" : "justify-end"
      }`}
    >
      {isAssistant ? (
        <AssistantMessage {...props} time={time} />
      ) : (
        <UserMessage msg={msg} time={time} />
      )}
    </motion.div>
  );
});

export default ChatMessage;
