import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RATING_OPTIONS } from "./constants";
import { getQuestionWindowStart } from "./helpers";

// Card sizes are plain pixels worked out in JS, never rem, so the cards, the
// list window and the slide distance always match whatever the page's root
// font size is. Cards are the same size as the screening question options
// (70px, 80px from md up, 10px apart); short screens show fewer rows.
const CARD_GAP = 10;
const CARD_HEIGHT = 70;
const MD_CARD_HEIGHT = 80;
const MD_QUERY = "(min-width: 768px)";
const MAX_VISIBLE_ROWS = 4;

// Shared easing so the list slide and the card highlight move in sync
const SLIDE_TRANSITION = { duration: 0.45, ease: [0.22, 1, 0.36, 1] };

const px = (value) => parseFloat(value) || 0;

// How many question rows fit once the header, the rating buttons and the
// gaps between them are taken out of the screen height, and the card height
// for this screen width. Short phones show fewer rows instead of scrolling.
const useCardLayout = () => {
  const mainRef = useRef(null);
  const headerRef = useRef(null);
  const topSpacerRef = useRef(null);
  const bottomSpacerRef = useRef(null);
  const ratingsRef = useRef(null);
  const [layout, setLayout] = useState({
    rows: MAX_VISIBLE_ROWS,
    cardHeight: MD_CARD_HEIGHT,
  });

  useLayoutEffect(() => {
    const main = mainRef.current;
    const header = headerRef.current;
    const topSpacer = topSpacerRef.current;
    const bottomSpacer = bottomSpacerRef.current;
    const ratings = ratingsRef.current;
    if (!main || !header || !topSpacer || !bottomSpacer || !ratings) return;

    const measure = () => {
      const mainStyle = getComputedStyle(main);
      const available =
        main.clientHeight -
        px(mainStyle.paddingTop) -
        px(mainStyle.paddingBottom) -
        header.offsetHeight -
        ratings.offsetHeight -
        px(getComputedStyle(topSpacer).minHeight) -
        px(getComputedStyle(bottomSpacer).minHeight);

      const cardHeight = window.matchMedia(MD_QUERY).matches
        ? MD_CARD_HEIGHT
        : CARD_HEIGHT;
      const fit = Math.floor((available + CARD_GAP) / (cardHeight + CARD_GAP));
      const rows = Math.min(MAX_VISIBLE_ROWS, Math.max(1, fit));

      setLayout((prev) =>
        prev.rows === rows && prev.cardHeight === cardHeight
          ? prev
          : { rows, cardHeight },
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    // The header can change height when a long domain name wraps
    observer.observe(main);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return {
    mainRef,
    headerRef,
    topSpacerRef,
    bottomSpacerRef,
    ratingsRef,
    ...layout,
  };
};

// Quiz-style layout that never scrolls. On mobile the header sits at the top,
// the 1-5 rating buttons stay pinned to the bottom, and the question cards are
// centred between them with an equal gap above and below. From tablet up
// everything is grouped and centred. Short screens show fewer cards.
const DomainScoring = ({ scoringState, onRatingSelect, scrollRef }) => {
  const { dataset, currentDomainIdx, currentQuestionIdx, selectedRating } =
    scoringState;
  const activeDomain = dataset[currentDomainIdx];
  const totalDomains = dataset.length;
  const currentStepNum = currentDomainIdx + 1;
  const progressPercent =
    totalDomains > 0 ? (currentStepNum / totalDomains) * 100 : 0;

  const {
    mainRef,
    headerRef,
    topSpacerRef,
    bottomSpacerRef,
    ratingsRef,
    rows,
    cardHeight,
  } = useCardLayout();
  const rowHeight = cardHeight + CARD_GAP;
  const visibleCount = Math.min(rows, activeDomain.questions.length);
  const topIndex = getQuestionWindowStart(
    activeDomain.questions.length,
    currentQuestionIdx,
    rows,
  );

  return (
    <main
      ref={mainRef}
      className="flex-1 min-h-0 flex flex-col items-center md:justify-center text-center max-w-2xl w-full mx-auto px-5 md:px-4 pt-4 md:pt-0"
    >
      {/* Step, domain name and progress */}
      <div
        ref={headerRef}
        className="flex flex-col items-center gap-3 w-full shrink-0"
      >
        <div className="bg-white/10 px-5 py-2.5 rounded-full inline-block">
          <span className="text-[15px] font-semibold tracking-wide text-white">
            Step {currentStepNum}/{totalDomains}
          </span>
        </div>

        <h2 className="text-[24px] md:text-[30px] font-medium text-white tracking-[-4%] leading-[1.2] text-balance">
          {activeDomain.domain}
        </h2>

        <div className="w-full max-w-[420px] bg-white/20 h-1 rounded-full overflow-hidden mx-auto">
          <div
            className="bg-white h-full w-full origin-left transition-transform duration-300 rounded-full"
            style={{ transform: `scaleX(${progressPercent / 100})` }}
          />
        </div>
      </div>

      {/* The two spacers split the leftover height equally on mobile, so the
          gap above the cards always matches the gap below them */}
      <div
        ref={topSpacerRef}
        aria-hidden="true"
        className="flex-1 md:flex-none min-h-[24px] md:min-h-[28px]"
      />

      {/* Question list: up to 4 rows, fewer on short screens */}
      <div className="shrink-0 w-full flex justify-center">
        <div
          className="relative w-full max-w-[420px] overflow-hidden"
          style={{
            height: visibleCount * rowHeight - CARD_GAP,
          }}
        >
          {/* Keyed by domain so a new domain fades in fresh instead of
            sliding back up through the previous domain's offset */}
          {/* Only opacity and full `transform` strings are animated here so the
            browser can run every animation on the GPU compositor */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentDomainIdx}
              initial={{ opacity: 0, transform: "translateY(16px)" }}
              animate={{ opacity: 1, transform: "translateY(0px)" }}
              exit={{ opacity: 0, transform: "translateY(-16px)" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute inset-x-0 top-0 flex justify-center"
            >
              <motion.div
                initial={false}
                animate={{
                  transform: `translateY(${-(topIndex * rowHeight)}px)`,
                }}
                transition={SLIDE_TRANSITION}
                style={{ willChange: "transform", rowGap: CARD_GAP }}
                className="flex flex-col items-center w-full"
              >
                {activeDomain.questions.map((qText, idx) => {
                  const isCurrent = idx === currentQuestionIdx;
                  const label = `Q${idx + 1}. ${qText}`;

                  return (
                    <motion.div
                      key={idx}
                      initial={false}
                      animate={{
                        opacity: isCurrent ? 1 : 0.45,
                        transform: isCurrent ? "scale(1)" : "scale(0.92)",
                      }}
                      transition={SLIDE_TRANSITION}
                      style={{ height: cardHeight }}
                      className="relative w-full rounded-[24px] text-[15px] md:text-[16px] leading-[1.3] font-semibold text-left shrink-0 overflow-hidden bg-[#68270B]/20 text-white/80"
                    >
                      <span className="absolute inset-0 flex items-center px-[20px] md:px-[30px]">
                        {label}
                      </span>
                      {/* White highlight crossfades in, instead of animating colors */}
                      <motion.span
                        aria-hidden="true"
                        initial={false}
                        animate={{ opacity: isCurrent ? 1 : 0 }}
                        transition={SLIDE_TRANSITION}
                        className="absolute inset-0 flex items-center px-[20px] md:px-[30px] bg-[#FAFAE8] text-[#68270B]"
                      >
                        {label}
                      </motion.span>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div
        ref={bottomSpacerRef}
        aria-hidden="true"
        className="flex-1 md:flex-none min-h-[24px] md:min-h-[28px]"
      />

      {/* Rating controls: always visible and the same size. 60px circles
          that only shrink if a very narrow phone needs it */}
      <div
        ref={ratingsRef}
        className="flex flex-col items-center gap-3 shrink-0 w-full pb-2 md:pb-0"
      >
        <div className="flex justify-center items-center gap-2 md:gap-3 w-full">
          {RATING_OPTIONS.map((num) => {
            const isSelected = selectedRating === num;
            return (
              <button
                key={num}
                onClick={() => onRatingSelect(num)}
                className={`flex-1 min-w-0 max-w-[60px] aspect-square rounded-full flex items-center justify-center font-semibold text-[17px] transition-[background-color,color,transform] duration-150 cursor-pointer ${
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

        <p className="text-[12px] text-white/90 font-medium">
          Rate from 1-5 based on the severity of your symptoms.
        </p>
      </div>

      <div ref={scrollRef} />
    </main>
  );
};

export default DomainScoring;
