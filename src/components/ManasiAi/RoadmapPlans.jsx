import { useState } from "react";
import { motion } from "framer-motion";
import inparrow from "../../assets/Ai/inparrow.svg";
import PlanPicker from "../PlanPicker";
import { ROADMAP_CONTROL_HEIGHT } from "./constants";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Title, plan picker and email field come in one after another,
// after the thank-you card has left
const PICKER_DELAY = 0.15;
const EMAIL_DELAY = 0.35;

// Same look as the chat input: white pill with a round send button
const EmailResultsForm = ({ onSendEmail }) => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");

  const trimmed = email.trim();
  const isSending = status === "sending";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSending) return;
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError("Enter a valid email address");
      return;
    }

    setError("");
    setStatus("sending");
    try {
      await onSendEmail(trimmed);
      setStatus("sent");
    } catch (err) {
      console.error("Failed to send results email:", err);
      setError("We couldn't send your results. Please try again.");
      setStatus("error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: EMAIL_DELAY }}
      className="w-full max-w-[480px] flex flex-col items-center gap-5"
    >
      <h2 className="text-[22px] md:text-[28px] font-medium text-white tracking-[-3%] leading-[1.2]">
        Enter email to get results
      </h2>

      {status === "sent" ? (
        <p className="text-[14px] md:text-[16px] text-white/90">
          Your results are on their way to {trimmed}
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          className={`w-full ${ROADMAP_CONTROL_HEIGHT} rounded-[24px] pl-5 pr-2 bg-white flex items-center gap-2 ${
            error ? "ring-1 ring-red-400" : ""
          }`}
        >
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            disabled={isSending}
            placeholder="Your email address"
            aria-label="Email address"
            aria-invalid={Boolean(error)}
            className="flex-1 min-w-0 bg-transparent text-[14px] md:text-[16px] font-semibold text-gray-800 placeholder:text-[#B77145] outline-none select-text"
          />
          <button
            type="submit"
            disabled={!trimmed || isSending}
            aria-label="Send results to my email"
            className="w-11 h-11 md:w-12 md:h-12 shrink-0 rounded-full bg-[#B77145] hover:bg-amber-800 disabled:bg-amber-700/40 flex items-center justify-center transition cursor-pointer disabled:cursor-not-allowed"
          >
            <img
              src={inparrow}
              alt=""
              className={`-rotate-45 h-3 ${isSending ? "animate-pulse" : ""}`}
            />
          </button>
        </form>
      )}

      {error && (
        <p className="-mt-3 text-[12px] md:text-[14px] text-white/90">{error}</p>
      )}
    </motion.div>
  );
};

// Shown after the roadmap is submitted: the same plan picker as the
// Subscription page (one card at a time), then the email field
const RoadmapPlans = ({ onSendEmail }) => (
  <div className="w-full py-4 px-4 flex flex-col items-center text-center">
    <motion.h1
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="text-[30px] md:text-[30px] font-normal leading-[1.2] tracking-[-4%] text-center mb-6 [@media(max-height:700px)]:mb-3 text-white"
    >
      Find Your Perfect Plan
    </motion.h1>

    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: PICKER_DELAY }}
      className="w-full flex flex-col items-center text-[#B77145]"
    >
      <PlanPicker carousel compact showTabs={false} />
    </motion.div>

    <div className="mt-10 md:mt-12 w-full flex justify-center">
      <EmailResultsForm onSendEmail={onSendEmail} />
    </div>
  </div>
);

export default RoadmapPlans;
