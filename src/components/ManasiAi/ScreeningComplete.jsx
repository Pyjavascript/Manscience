import ai from "../../assets/Ai/ai.svg";
import journey from "../../assets/Ai/journey.svg";
import journeyWhite from "../../assets/Ai/journeyWhite.svg";
import { SCREENING_COMPLETE_MESSAGE } from "./constants";

// Shown between the screening questions and the domain scoring
const ScreeningComplete = ({ onBegin }) => (
  <main className="flex-1 min-h-0 flex flex-col items-center justify-center text-center gap-8 max-w-2xl w-full mx-auto px-4">
    <img src={ai} alt="Manasi" className="h-12.5 md:h-19.5" />

    <p className="text-[22px] md:text-[32px] font-medium text-white tracking-[-3%] leading-[1.25]">
      {SCREENING_COMPLETE_MESSAGE}
    </p>

    <button
      onClick={onBegin}
      className="group flex items-center gap-2.5 font-medium text-[15px] p-4.25 rounded-full transition-all duration-200 cursor-pointer active:scale-95 bg-[#FAF4E8] text-[#68270B] hover:bg-[#68270B] hover:text-white"
    >
      <img src={journey} alt="icon" className="group-hover:hidden" />
      <img src={journeyWhite} alt="icon" className="hidden group-hover:block" />
      <span className="manrope">Begin My Journey</span>
    </button>
  </main>
);

export default ScreeningComplete;
