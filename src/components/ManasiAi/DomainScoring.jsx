import { motion } from "framer-motion";
import { RATING_OPTIONS } from "./constants";
import { getQuestionWindowStart } from "./helpers";

// Height of one question card + gap, used to slide the list
const QUESTION_ROW_HEIGHT = 85;

const DomainScoring = ({ scoringState, onRatingSelect, scrollRef }) => {
  const { dataset, currentDomainIdx, currentQuestionIdx, selectedRating } =
    scoringState;
  const activeDomain = dataset[currentDomainIdx];
  const totalDomains = dataset.length;
  const currentStepNum = currentDomainIdx + 1;
  const progressPercent =
    totalDomains > 0 ? (currentStepNum / totalDomains) * 100 : 0;
  const topIndex = getQuestionWindowStart(
    activeDomain.questions.length,
    currentQuestionIdx,
  );

  return (
    <main className="flex-1 min-h-0 flex flex-col justify-between items-center gap-5 text-center max-w-2xl w-full mx-auto px-4 py-2 pt-7.5 md:pt-0 my-auto">
      {/* Step Pill Badge */}
      <div className="flex flex-col items-center gap-3 w-full shrink-0">
        <div className="bg-white/10 px-5 py-3 rounded-full inline-block">
          <span className="text-[15px] font-semibold tracking-wide text-white">
            Step {currentStepNum}/{totalDomains}
          </span>
        </div>

        <h2 className="text-[24px] md:text-[30px] font-medium text-white tracking-[-4%] leading-[1.2]">
          {activeDomain.domain}
        </h2>

        <div className="w-full max-w-[320px] md:max-w-120 bg-white/20 h-1 rounded-full overflow-hidden mx-auto">
          <div
            className="bg-white h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Sliding question list */}
      <div className="relative w-full max-w-xl h-82.5 overflow-hidden flex flex-col items-center justify-start my-2 shrink-0">
        <motion.div
          animate={{ y: -(topIndex * QUESTION_ROW_HEIGHT) }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="flex flex-col items-center gap-2.5 w-full absolute top-0"
        >
          {activeDomain.questions.map((qText, idx) => {
            const isCurrent = idx === currentQuestionIdx;

            return (
              <motion.div
                key={idx}
                animate={{
                  opacity: isCurrent ? 1 : 0.45,
                  scale: isCurrent ? 1 : 0.96,
                }}
                transition={{ duration: 0.2 }}
                className={`rounded-[22px] h-18.75 w-77.5 md:w-120 md:rounded-[28px] flex items-center px-6 text-[13px] md:text-[15px] font-medium text-left shrink-0 transition-colors duration-200 ${
                  isCurrent
                    ? "bg-white text-[#68270B]"
                    : "bg-[#68270B]/20 text-white/80"
                }`}
              >
                Q{idx + 1}. {qText}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Rating Controls Section */}
      <div className="flex flex-col items-center gap-2 shrink-0 w-full">
        <div className="flex justify-center items-center gap-2 md:gap-3">
          {RATING_OPTIONS.map((num) => {
            const isSelected = selectedRating === num;
            return (
              <button
                key={num}
                onClick={() => onRatingSelect(num)}
                className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center font-semibold text-[15px] md:text-[17px] transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-[#68270B] text-white scale-105"
                    : "bg-white text-[#68270B] hover:bg-white/90"
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>

        <p className="text-[12px] text-white/90 font-medium mt-1">
          Rate from 1-5 based on the severity of your symptoms
        </p>
      </div>

      <div ref={scrollRef} />
    </main>
  );
};

export default DomainScoring;
