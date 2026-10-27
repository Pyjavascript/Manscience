import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiThumbsDown, FiThumbsUp } from "react-icons/fi";
import { postFeedback } from "./api";
import { FEEDBACK_MAX_CHARS } from "./constants";

const BOX_TRANSITION = { duration: 0.2, ease: "easeOut" };

const RESULT_MESSAGES = {
  saved: "Thanks for the feedback.",
  duplicate: "Feedback already recorded.",
};

const ThumbButton = ({ icon: Icon, label, isSelected, disabled, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    aria-pressed={isSelected}
    title={label}
    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-150 cursor-pointer disabled:cursor-default ${
      isSelected
        ? "bg-[#FAF4E8] text-[#68270B]"
        : "text-white/80 hover:text-white hover:bg-[#68270B]/15 disabled:hover:bg-transparent disabled:hover:text-white/80"
    }`}
  >
    <Icon size={14} strokeWidth={2.25} />
  </button>
);

// Thumbs up/down under a Manasi reply. Thumbs-up sends straight away;
// thumbs-down opens an optional "what did you expect" box first.
// `children` (the message time) is shown at the start of the same row.
const FeedbackButtons = ({ sessionId, responseId, children }) => {
  // idle | typing | sending | done | error
  const [status, setStatus] = useState("idle");
  const [rating, setRating] = useState(null);
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");

  const isSending = status === "sending";
  const isDone = status === "done";
  const showBox =
    rating === "dislike" && (status === "typing" || isSending || status === "error");

  const send = async (nextRating, suggestion) => {
    setRating(nextRating);
    setStatus("sending");
    const result = await postFeedback({
      sessionId,
      responseId,
      rating: nextRating,
      suggestion,
    });
    if (result === "failed") {
      setStatus("error");
      setMessage("Couldn't send feedback. Please try again.");
      return;
    }
    setStatus("done");
    setMessage(RESULT_MESSAGES[result]);
  };

  const openDislikeBox = () => {
    setRating("dislike");
    setStatus("typing");
  };

  const cancelDislike = () => {
    setRating(null);
    setStatus("idle");
    setText("");
  };

  const locked = isSending || isDone;

  return (
    <div className="flex flex-col items-start gap-2 w-full">
      <div className="flex items-center gap-1">
        {children && (
          <>
            {children}
            <span className="mx-2 h-4 w-px bg-white/30" aria-hidden="true" />
          </>
        )}
        <ThumbButton
          icon={FiThumbsUp}
          label="Good response"
          isSelected={rating === "like"}
          disabled={locked || showBox}
          onClick={() => send("like")}
        />
        <ThumbButton
          icon={FiThumbsDown}
          label="Bad response"
          isSelected={rating === "dislike"}
          disabled={locked || showBox}
          onClick={openDislikeBox}
        />

        {(isDone || (status === "error" && !showBox)) && (
          <p className="ml-1.5 text-[12px] font-medium text-white/80">
            {message}
          </p>
        )}
      </div>

      <AnimatePresence>
        {showBox && (
          <motion.div
            key="feedback-box"
            initial={{ opacity: 0, transform: "translateY(-6px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0, transform: "translateY(-6px)" }}
            transition={BOX_TRANSITION}
            className="w-full md:w-150 max-w-full flex flex-col gap-3 text-white bg-[#68270B]/15 font-medium leading-[140%] tracking-[-2%] text-[15px] px-5.25 py-5 rounded-3xl md:rounded-[34px] select-text"
          >
            <label htmlFor={`feedback-${responseId}`}>
              What did you expect instead?
            </label>
            <textarea
              id={`feedback-${responseId}`}
              autoFocus
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={FEEDBACK_MAX_CHARS}
              disabled={isSending}
              placeholder="Optional. Tell us what was missing or wrong."
              className="w-full rounded-2xl md:rounded-3xl bg-[#68270B]/15 px-4 py-3 text-[15px] font-medium leading-[140%] text-white placeholder:text-white/60 resize-none focus:outline-none focus:ring-1 focus:ring-white/40"
            />

            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-medium text-white/70">
                {text.length}/{FEEDBACK_MAX_CHARS}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelDislike}
                  disabled={isSending}
                  className="px-4 py-2.5 rounded-full text-[14px] font-medium text-white/80 hover:text-white hover:bg-[#68270B]/15 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
                >
                  Cancel
                </button>
                <button
                  onClick={() => send("dislike", text.trim() || undefined)}
                  disabled={isSending}
                  className="px-5.5 py-2.5 rounded-full bg-[#FAF4E8] text-[#68270B] text-[14px] font-medium hover:bg-[#68270B] hover:text-white transition-colors duration-200 cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-default disabled:active:scale-100"
                >
                  {isSending ? "Sending…" : "Submit"}
                </button>
              </div>
            </div>

            {status === "error" && (
              <p className="text-[12px] font-semibold text-white">{message}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FeedbackButtons;
