export const ArrowLeft = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    className="shrink-0"
  >
    <path
      d="M13 8H3M7 4L3 8l4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PILL_CLASS =
  "h-10 md:h-11 min-w-20 md:min-w-22 px-5 flex items-center justify-center gap-2 rounded-full text-[13px] md:text-[14px] font-medium manrope";

// Bottom bar of the roadmap screens: a Back button and, when given,
// a "current/total" step counter next to it
const StepFooter = ({ onBack, current, total }) => (
  <footer className="shrink-0 flex items-center justify-center gap-1.5 pt-4">
    <button
      type="button"
      onClick={onBack}
      className={`${PILL_CLASS} bg-[#68270B] text-white cursor-pointer transition-[background-color,transform] duration-200 hover:bg-[#561F08] active:scale-95`}
    >
      <ArrowLeft />
      Back
    </button>

    {total > 0 && (
      <div
        className={`${PILL_CLASS} bg-white text-[#68270B] tabular-nums`}
        aria-label={`Question ${current} of ${total}`}
      >
        {current}/{total}
      </div>
    )}
  </footer>
);

export default StepFooter;
