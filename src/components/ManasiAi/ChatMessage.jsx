import { memo } from "react";
import { motion } from "framer-motion";
import ai from "../../assets/Ai/ai.svg";
import sent from "../../assets/Ai/sent.svg";
import inparrow from "../../assets/Ai/inparrow.svg";
import inparrowbrown from "../../assets/Ai/inparrowbrown.svg";
import journey from "../../assets/Ai/journey.svg";
import journeyWhite from "../../assets/Ai/journeyWhite.svg";
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

const BeginJourneyButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="group flex items-center gap-2.5 font-medium text-[15px] p-4.25 rounded-full transition-all duration-200 cursor-pointer active:scale-95 bg-[#FAF4E8] text-[#68270B] hover:bg-[#68270B] hover:text-white"
  >
    <img src={journey} alt="icon" className="group-hover:hidden" />
    <img src={journeyWhite} alt="icon" className="hidden group-hover:block" />
    <span className="manrope">Begin My Journey</span>
  </button>
);

const QuizOptions = ({
  msg,
  isLastMessage,
  hasLongOption,
  selectedQuizOption,
  onSelect,
}) => {
  const isLocked = !isLastMessage || !!msg.selectedAnswer;

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
            disabled={isLocked}
            onClick={() => onSelect(msg.step, opt)}
            className={`font-medium text-[15px] md:text-[17px] py-3.5 rounded-full transition-all duration-200 flex items-center justify-center gap-2 ${
              hasLongOption ? "w-full text-center" : "w-25 md:w-36.25"
            } ${
              isSelected
                ? "bg-[#68270B] text-white"
                : "bg-[#FAF4E8] text-[#68270B] hover:bg-opacity-90 active:scale-95"
            } ${isLocked ? "cursor-default opacity-80" : "cursor-pointer"}`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
};

const AssistantMessage = ({
  msg,
  index,
  time,
  isLastMessage,
  selectedQuizOption,
  onQuizOptionSelect,
  onLinkCtaClick,
  onRoadmapCtaClick,
  onBeginJourneyClick,
}) => {
  const hasLongOption =
    msg.isQuiz && msg.options?.some((opt) => opt.length > 15);
  const showCtas = msg.cta && msg.cta.cta_found && !msg.activeCta;

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

        <p className="whitespace-pre-wrap wrap-break-word">
          {msg.content?.trim()}
        </p>

        {msg.isQuiz && (
          <QuizOptions
            msg={msg}
            isLastMessage={isLastMessage}
            hasLongOption={hasLongOption}
            selectedQuizOption={selectedQuizOption}
            onSelect={onQuizOptionSelect}
          />
        )}
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

          {/* 2. Get a Roadmap CTA */}
          {msg.cta.cta_category === "Condition" && (
            <CtaArrowButton
              label="Get a Roadmap"
              onClick={() => onRoadmapCtaClick(index)}
            />
          )}

          {/* 3. Begin My Journey Assessment CTA */}
          {msg.cta.cta_category === "StartAssessment" && (
            <BeginJourneyButton
              onClick={() => onBeginJourneyClick(index, msg.cta.dataset)}
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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
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
