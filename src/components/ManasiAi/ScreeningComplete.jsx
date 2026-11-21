import journey from "../../assets/Ai/journey.svg";
import journeyWhite from "../../assets/Ai/journeyWhite.svg";
import {
  SCREENING_COMPLETE_MESSAGE,
  ROADMAP_CONTROL_HEIGHT,
} from "./constants";
import StepFooter from "./StepFooter";

// Shown between the screening questions and the domain scoring
const ScreeningComplete = ({ onBegin, onBack }) => (
  <>
    <main className="flex-1 min-h-0 flex flex-col items-center justify-center text-center gap-6 md:gap-8 max-w-2xl w-full mx-auto px-4">
      <p className="text-[22px] md:text-[32px] font-medium text-white tracking-[-3%] leading-[1.25] max-w-82.5 md:max-w-120">
        {SCREENING_COMPLETE_MESSAGE}
      </p>

      <button
        onClick={onBegin}
        className={`group flex items-center justify-center gap-2.5 font-medium text-[14px] md:text-[16px] ${ROADMAP_CONTROL_HEIGHT} min-w-[140px] px-6 md:px-10 rounded-full transition-all duration-200 cursor-pointer active:scale-95 bg-[#FAF4E8] text-[#68270B] hover:bg-[#68270B] hover:text-white`}
      >
        <img src={journey} alt="" className="group-hover:hidden" />
        <img src={journeyWhite} alt="" className="hidden group-hover:block" />
        <span className="manrope">Begin My Journey</span>
      </button>
    </main>

    <StepFooter onBack={onBack} />
  </>
);

export default ScreeningComplete;
