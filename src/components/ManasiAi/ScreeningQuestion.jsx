import { AnimatePresence, motion } from "framer-motion";
import { QUESTIONNAIRE } from "./constants";

const QUESTION_TRANSITION = { duration: 0.35, ease: [0.22, 1, 0.36, 1] };

// One centred screening question with its answers as pill buttons.
// Keyed by step so each question fades out fully before the next fades in.
const ScreeningQuestion = ({ step, selectedOption, onSelect }) => {
  const { question, options } = QUESTIONNAIRE[step];
  const isLocked = selectedOption !== null;

  return (
    <main className="flex-1 min-h-0 flex flex-col items-center justify-center text-center max-w-3xl w-full mx-auto px-4">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, transform: "translateY(16px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          exit={{ opacity: 0, transform: "translateY(-16px)" }}
          transition={QUESTION_TRANSITION}
          className="flex flex-col items-center gap-6 md:gap-8 w-full"
        >
          <div className="bg-white/10 px-5 py-3 rounded-full inline-block">
            <span className="text-[15px] font-semibold tracking-wide text-white">
              Question {step + 1}/{QUESTIONNAIRE.length}
            </span>
          </div>

          <h1 className="text-[24px] md:text-[36px] font-medium text-white tracking-[-3%] leading-[1.2] max-w-82.5 md:max-w-2xl">
            {question}
          </h1>

          {/* Stacked on mobile, one row on desktop. Every pill is the same
              width, sized to the longest label so none wrap onto two lines */}
          <div className="flex flex-col items-center gap-2 w-full md:grid md:grid-flow-col md:auto-cols-fr md:w-auto md:gap-3">
            {options.map((opt) => {
              const isSelected = selectedOption === opt;
              return (
                <button
                  key={opt}
                  disabled={isLocked}
                  onClick={() => onSelect(opt)}
                  className={`w-full max-w-70 md:max-w-none md:min-w-50 whitespace-nowrap font-medium text-[15px] md:text-[17px] px-6 py-3.5 rounded-full transition-[background-color,color,transform] duration-200 ${
                    isSelected
                      ? "bg-[#68270B] text-white"
                      : "bg-[#FAF4E8] text-[#68270B] enabled:hover:bg-[#68270B] enabled:hover:text-white"
                  } ${isLocked ? "cursor-default" : "cursor-pointer active:scale-95"}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </main>
  );
};

export default ScreeningQuestion;
