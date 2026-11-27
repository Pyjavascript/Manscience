import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import tick from "../assets/tick.svg";

const BUY_URL = "https://www.manascience.in/coming-soon";

const PLANS = [
  {
    id: "starter",
    tabLabel: "Starter",
    title: "Single Roadmap",
    subtitle: "A personalized roadmap for your therapy journey.",
    price: "₹1,499",
    period: "",
    buttonText: "Get Involved",
    image:
      "https://res.cloudinary.com/dspwbbjyt/image/upload/v1785938548/Image_jyjcj0.png",
    includes: [
      "One personalized Manasi roadmap",
      "7-day full platform access",
      "Therapy Library & Learning Hub",
      "Community access",
      "One time roadmap only",
    ],
  },
  {
    id: "quarterly",
    tabLabel: "Quarterly",
    title: "Quarterly Care",
    subtitle:
      "Consistent guidance and structured support designed for families.",
    price: "₹3,999",
    period: "/quarter",
    buttonText: "Get Involved",
    image:
      "https://res.cloudinary.com/dspwbbjyt/image/upload/v1795687013/Group_1261154510_1_f7ljrg.png",
    includes: [
      "+1 personalized Manasi roadmap",
      "Full platform access",
      "Therapy Library & Learning Hub",
      "Community access",
      "Updatable roadmaps",
    ],
  },
  {
    id: "yearly",
    tabLabel: "Yearly",
    title: "Yearly Care",
    subtitle: "A year of guidance, resources and roadmap updates",
    price: "₹11,999",
    period: "/year",
    buttonText: "Get Involved",
    image:
      "https://res.cloudinary.com/dspwbbjyt/image/upload/v1789202513/Group_1261154509_r7pqmu.png",
    includes: [
      "+2 personalized Manasi roadmaps",
      "Full platform access",
      "Therapy Library & Learning Hub",
      "Community access",
      "Updatable roadmaps",
    ],
  },
];

// How far a card has to be dragged before it changes plan
const SWIPE_THRESHOLD = 60;

// Card slides in from the side it was asked for (carousel mode only)
const cardSlide = {
  enter: (dir) => ({ opacity: 0, x: dir * 80 }),
  center: { opacity: 1, x: 0 },
  exit: (dir) => ({ opacity: 0, x: dir * -80 }),
};

// Plan tabs, one plan card and the "Know more" pop-up. Used by the
// Subscription page and after the roadmap is submitted.
// `carousel` adds swiping between cards, a slide animation and dots.
// `showTabs` and `compact` let the roadmap screen hide the plan tabs and
// use a smaller card; the Subscription page keeps the defaults.
const PlanPicker = ({
  activePlanId = null,
  onBuy = () => window.location.assign(BUY_URL),
  carousel = false,
  showTabs = true,
  compact = false,
}) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const popupRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setIsPopupOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const currentPlan = PLANS[selectedIdx];
  const isCurrentlyActive = activePlanId === currentPlan.id;

  const selectPlan = (idx) => {
    if (idx < 0 || idx >= PLANS.length || idx === selectedIdx) return;
    setDirection(idx > selectedIdx ? 1 : -1);
    setSelectedIdx(idx);
  };

  const handleDragEnd = (_event, { offset }) => {
    if (offset.x < -SWIPE_THRESHOLD) selectPlan(selectedIdx + 1);
    else if (offset.x > SWIPE_THRESHOLD) selectPlan(selectedIdx - 1);
  };

  const cardBody = (
    <>
      {/* Dynamic Card Header Text */}
      <h2 className={`${compact ? "text-[24px] md:text-[30px] mb-2" : "text-[28px] md:text-[32px] lg:text-[38px] mb-3"} font-medium text-[#B77145] leading-[120%] tracking-[-4%]`}>
        {currentPlan.title}
      </h2>
      <p className={`${compact ? "text-[13px] md:text-[15px] mb-4" : "text-[13px] md:text-[16px] mb-6.5"} text-[#B77145]/80 max-w-[220px] md:max-w-[280px] leading-relaxed min-h-[3.25em] line-clamp-2 font-normal tracking-[-2%]`}>
        {currentPlan.subtitle}
      </p>

      <div className={`${compact ? "text-[20px] md:text-[22px] mb-4" : "text-[20px] md:text-[24px] mb-6"} font-bold text-[#B77145]`}>
        {currentPlan.price}
        <span className="text-lg md:text-[16px] font-semibold mb-6 text-[#B77145]">
          {currentPlan.period}
        </span>
      </div>

      {/* Featured Image Block with Dynamic Button overlay */}
      <div className={`relative w-full ${compact ? "aspect-3/2 [@media(max-height:700px)]:aspect-16/10 rounded-[28px] md:rounded-[36px]" : "aspect-4/3 rounded-[30px] md:rounded-[40px]"} overflow-hidden group`}>
        <img
          src={currentPlan.image}
          alt={currentPlan.title}
          draggable={false}
          className="w-full h-full object-cover transition-transform duration-500"
        />

        {/* Floating Action Button */}
        <div className={`absolute inset-0 flex items-end justify-center ${compact ? "p-5" : "p-6"} bg-linear-to-t from-black/20 via-transparent to-transparent`}>
          <button
            onClick={onBuy}
            disabled={isCurrentlyActive}
            className={`cursor-pointer disabled:cursor-default bg-[#b77145]  text-white ${compact ? "w-[150px] h-[54px] md:h-[60px]" : "w-[160px] md:w-[160px] h-[60px] md:h-[70px]"} rounded-full text-sm  font-semibold transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.02]`}
          >
            {isCurrentlyActive ? "Current Plan" : currentPlan.buttonText}
          </button>
        </div>
      </div>
    </>
  );

  const cardClassName = compact
    ? "h-auto w-full max-w-[310px] md:max-w-[370px] lg:max-w-[390px] bg-[#FAF4E8] rounded-[40px] md:rounded-[52px] p-3.5 pt-6 md:p-5 md:pt-7 flex flex-col items-center text-center shadow-xs manrope mb-5"
    : "md:h-[480px] lg:h-[540px] h-auto w-full max-w-82.5  md:max-w-[420px] lg:max-w-[440px] lg:max-w-125 bg-[#FAF4E8] rounded-[45px] md:rounded-[60px] px-[15px] py-[15px] pt-[25px] md:pb-[25px] md:pt-[40px] md:px-[25px] flex flex-col items-center text-center shadow-xs manrope mb-7.5";

  return (
    <>
      {showTabs && (
        <div
          className="bg-[#B77145] h-[51px] md:h-[67px] p-[5px] rounded-full mb-10 flex items-center justify-between w-auto gap-[2px] md:gap-[5px]"
        >
          {PLANS.map((plan, idx) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => selectPlan(idx)}
              className={`cursor-pointer flex-1 h-full rounded-full text-sm sm:text-base font-medium text-[14px] transition-all duration-300 flex items-center justify-center leading-[115%] tracking-[-3%] py-[15px] px-[19px] md:py-5.75 md:px-[19px]  w-[80px]  md:w-[80px] ${
                selectedIdx === idx
                  ? "bg-white text-[#B77145] shadow-sm"
                  : "text-white hover:text-white/80"
              }`}
            >
              {plan.tabLabel}
            </button>
          ))}
        </div>
      )}

      {/* Main Card Container */}
      {carousel ? (
        // Fixed-width frame so the sliding card doesn't move what's around it
        <div className="w-full flex justify-center overflow-hidden">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={currentPlan.id}
              custom={direction}
              variants={cardSlide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeOut" }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.35}
              onDragEnd={handleDragEnd}
              className={`${cardClassName} touch-pan-y cursor-grab active:cursor-grabbing`}
            >
              {cardBody}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <div className={cardClassName}>{cardBody}</div>
      )}

      <div ref={popupRef} className="relative group inline-block mb-5 z-30">
        {/* Know More Button */}
        <button
          type="button"
          onClick={() => setIsPopupOpen((prev) => !prev)}
          className="cursor-pointer text-sm md:text-[16px] font-bold text-[#68270B] leading-[120%] tracking-[-2%] border-b border-transparent group-hover:border-solid group-hover:border-[#68270B] transition-all focus:outline-none"
        >
          Know more
        </button>

        {/* Popup Bubble */}
        <div className={`custom-popup ${isPopupOpen ? "is-open" : ""}`}>
          <h4 className="font-semibold text-[14px] md:text-[16px] mb-3 md:mb-2 lg:mb-3.75 leading-[130%] tracking-[0%]">
            Whats included
          </h4>

          <ul className="flex flex-col gap-1.25 font-normal text-[12px] lg:text-[16px]">
            {currentPlan.includes.map((item) => (
              <li key={item} className="flex items-center gap-[2.5px]">
                <img
                  src={tick}
                  alt="tick"
                  className="md:w-4 md:h-4 h-2.5 w-2.5"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {carousel && (
        <div className="flex items-center gap-1.5">
          {PLANS.map((plan, idx) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => selectPlan(idx)}
              aria-label={`Show ${plan.title}`}
              aria-current={selectedIdx === idx}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                selectedIdx === idx
                  ? "w-6 bg-[#68270B]"
                  : "w-2 bg-[#68270B]/30 hover:bg-[#68270B]/50"
              }`}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default PlanPicker;
