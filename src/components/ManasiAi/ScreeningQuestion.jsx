import { AnimatePresence, motion } from "framer-motion";
import { QUESTIONNAIRE, ROADMAP_CONTROL_HEIGHT } from "./constants";
import StepFooter from "./StepFooter";

const QUESTION_TRANSITION = { duration: 0.35, ease: [0.22, 1, 0.36, 1] };

// One centred screening question with its answers as pill buttons, and the
// Back button + question counter pinned to the bottom.
// Keyed by step so each question fades out fully before the next fades in.
const ScreeningQuestion = ({ step, selectedOption, onSelect, onBack }) => {
  const { question, options } = QUESTIONNAIRE[step];
  const isLocked = selectedOption !== null;

  return (
    <>
      <main className="flex-1 min-h-0 flex flex-col items-center justify-center text-center max-w-3xl w-full mx-auto px-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, transform: "translateY(16px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0, transform: "translateY(-16px)" }}
            transition={QUESTION_TRANSITION}
            className="flex flex-col items-center gap-8 md:gap-8 w-full"
          >
            {/* 470px wide from tablet up, as in the design, so long questions
                sit in about three even lines; text-balance evens out the
                line lengths on shorter questions too */}
            <h1 className="text-[22px] md:text-[28px] font-medium text-white tracking-[-3%] leading-[1.2] max-w-82.5 md:max-w-117.5 text-balance">
              {question}
            </h1>

            {/* Stacked on mobile, one row from tablet up. Every pill has the
              same fixed width on every question, wide enough for the longest
              label ("Started Recently") so none wrap onto two lines */}
            <div className="flex flex-col items-center gap-2 w-full md:flex-row md:justify-center md:gap-2.5">
              {options.map((opt) => {
                const isSelected = selectedOption === opt;
                return (
                  <button
                    key={opt}
                    disabled={isLocked}
                    onClick={() => onSelect(opt)}
                    className={`w-full max-w-70 md:w-42.5 md:max-w-none shrink-0 ${ROADMAP_CONTROL_HEIGHT} px-4 flex items-center justify-center whitespace-nowrap font-medium text-[14px] md:text-[16px] rounded-full transition-[background-color,color,transform] duration-200 ${
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

      <StepFooter
        onBack={onBack}
        current={step + 1}
        total={QUESTIONNAIRE.length}
      />
    </>
  );
};

export default ScreeningQuestion;
