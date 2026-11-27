import { Fragment } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QUESTIONNAIRE } from "./constants";
import { ArrowLeft } from "./StepFooter";

const QUESTION_TRANSITION = { duration: 0.35, ease: [0.22, 1, 0.36, 1] };

const CheckIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M3.5 8.5l3 3 6-7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// One screening question: progress circle, question, the answers stacked as
// cards, then Back / Next. Picking an answer only selects it; Next moves on.
// Keyed by step so each question fades out fully before the next fades in.
// Sizes are in px, not Tailwind's rem scale: Webflow can set <html> to 14px,
// which would shrink rem values away from the design.
// Counter, question, options and Back / Next are centred as one stack with
// the same gap between each, scaling with the screen height (dvh) up to the
// design size so everything fits without scrolling on short screens.
// The question always reserves 3 lines, so the stack is the same height on
// every question and the buttons don't move between steps.
const ScreeningQuestion = ({
  step,
  selectedOption,
  onSelect,
  onNext,
  onBack,
}) => {
  const { lines, options } = QUESTIONNAIRE[step];
  const total = QUESTIONNAIRE.length;

  return (
    // Scrolls only when the stack doesn't fit, with the bar hidden
    <main className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col w-full px-[16px]">
      <div className="my-auto flex flex-col items-center w-full gap-[clamp(20px,4.5dvh,40px)]">
        {/* Only the question part fades between steps; the buttons stay put */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, transform: "translateY(16px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0, transform: "translateY(-16px)" }}
            transition={QUESTION_TRANSITION}
            className="flex flex-col items-center w-full text-center gap-[clamp(20px,4.5dvh,40px)]"
          >
            <div
              className="size-[45px] md:size-[55px] shrink-0 flex items-center justify-center rounded-full bg-[#B77145] text-white text-[12px] md:text-[14px] font-medium tabular-nums"
              aria-label={`Question ${step + 1} of ${total}`}
            >
              {step + 1}/{total}
            </div>

            {/* Breaks exactly where the design does (lines from constants).
                min-h keeps 3 lines of height (3 x 1.2 line-height) */}
            <h1 className="min-h-[3.6em] flex items-center justify-center text-[20px] md:text-[30px] font-medium leading-[1.2] tracking-[-0.04em] text-white">
              <span>
                {lines.map((line, i) => (
                  <Fragment key={line}>
                    {i > 0 && <br />}
                    {line}
                  </Fragment>
                ))}
              </span>
            </h1>

            <div className="w-full max-w-[420px] flex flex-col gap-[10px]">
              {options.map((opt) => {
                const isSelected = selectedOption === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelect(opt)}
                    className={`w-full h-[70px] md:h-[80px] px-[20px] md:px-[30px] flex items-center justify-between gap-[12px] rounded-[24px] text-left text-[15px] md:text-[16px] font-semibold cursor-pointer transition-[background-color,color,transform] duration-200 active:scale-[0.99] ${
                      isSelected
                        ? "bg-[#FAF4E8] text-[#68270B]"
                        : "bg-[#68270B]/5 text-white/60 hover:bg-[#68270B]/10 hover:text-white"
                    }`}
                  >
                    <span className="truncate">{opt}</span>
                    {/* Unselected options show a faint bare tick in the same
                      spot, so nothing shifts when one is picked */}
                    <span
                      className={`size-[clamp(36px,7dvh,45px)] md:size-[clamp(40px,7dvh,52px)] shrink-0 flex items-center justify-center rounded-full transition-colors duration-200 ${
                        isSelected
                          ? "bg-[#B77145] text-white"
                          : "bg-transparent text-white/40"
                      }`}
                    >
                      <CheckIcon />
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <footer className="w-full max-w-[420px] flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="h-[60px] flex items-center gap-[8px] text-white text-[15px] md:text-[16px] font-semibold md:font-medium leading-[1.4] md:leading-[1.2] cursor-pointer transition-opacity duration-200 hover:opacity-80"
          >
            <ArrowLeft />
            Back
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={selectedOption === null}
            className="h-[60px] w-[140px] flex items-center justify-center rounded-full bg-[#FAF4E8] text-[#68270B] text-[15px] md:text-[16px] font-semibold md:font-medium leading-[1.4] md:leading-[1.2] transition-[background-color,color,opacity,transform] duration-200 enabled:cursor-pointer enabled:hover:bg-[#68270B] enabled:hover:text-white enabled:active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </footer>
      </div>
    </main>
  );
};

export default ScreeningQuestion;
