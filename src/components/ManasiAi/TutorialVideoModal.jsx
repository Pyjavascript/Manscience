import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiX } from "react-icons/fi";
import { TUTORIAL_VIDEO_URL } from "./constants";

const MODAL_TRANSITION = { duration: 0.3, ease: [0.22, 1, 0.36, 1] };
const FADE = { duration: 0.2 };

// Keeps the 16:9 card inside the viewport on short screens
const CARD_MAX_WIDTH = "min(1260px, calc((100dvh - 6rem) * 16 / 9))";

const ROUND_BUTTON_CLASS =
  "w-10 h-10 md:w-11 md:h-11 rounded-full bg-white text-[#B77145] flex items-center justify-center shadow-md hover:scale-105 transition-transform cursor-pointer disabled:cursor-default disabled:hover:scale-100";

const PLAY_MASK_ID = "tutorial-play-cutout";

// White disc with a rounded play triangle cut out of it, so the video
// shows through the triangle
const PlayIcon = () => (
  <svg viewBox="0 0 44 44" className="w-full h-full" aria-hidden="true">
    <mask id={PLAY_MASK_ID}>
      <rect width="44" height="44" fill="white" />
      <path
        d="M17 14.5 L30 22 L17 29.5 Z"
        fill="black"
        stroke="black"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </mask>
    <circle cx="22" cy="22" r="22" fill="white" mask={`url(#${PLAY_MASK_ID})`} />
  </svg>
);

// Shown on top of the video only while it is paused
const PausedOverlay = ({ children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={FADE}
  >
    {children}
  </motion.div>
);

// Full-bleed video with the title, "Tutorial" pill, close and play buttons
// laid over it while paused. Clicking the video pauses it.
const TutorialPlayer = ({ onClose }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const hasVideo = Boolean(TUTORIAL_VIDEO_URL);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

  return (
    <div className="relative aspect-video rounded-3xl md:rounded-[32px] overflow-hidden shadow-2xl bg-linear-to-tr from-[#B77145] via-[#D9B89C] to-[#E8D8C6]">
      {hasVideo && (
        <video
          ref={videoRef}
          src={TUTORIAL_VIDEO_URL}
          playsInline
          preload="metadata"
          onClick={togglePlayback}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="absolute inset-0 w-full h-full object-cover cursor-pointer"
        />
      )}

      <AnimatePresence>
        {!isPlaying && (
          <PausedOverlay key="paused-overlay">
            {/* Darkens the top edge so the white title stays readable */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-black/30 to-transparent pointer-events-none" />

            <h2
              id="tutorial-title"
              className="absolute top-5 left-5 md:top-10 md:left-9 text-white text-[22px] md:text-[44px] leading-[1.15] tracking-[-2%] font-medium pointer-events-none"
            >
              How to use
              <br />
              Manasi AI.
            </h2>

            <button
              onClick={onClose}
              aria-label="Close video"
              className={`absolute top-4 right-4 md:top-8 md:right-8 ${ROUND_BUTTON_CLASS}`}
            >
              <FiX size={20} strokeWidth={2.5} />
            </button>

            <span className="absolute bottom-4 left-5 md:bottom-8 md:left-9 px-5 py-2.5 md:px-11 md:py-5 rounded-full bg-white text-[#B77145] text-[12px] md:text-[14px] font-medium">
              Tutorial
            </span>

            <button
              onClick={togglePlayback}
              disabled={!hasVideo}
              aria-label="Play video"
              title={hasVideo ? undefined : "Video coming soon"}
              className="absolute bottom-4 right-4 md:bottom-8 md:right-8 w-10 h-10 md:w-11 md:h-11 hover:scale-105 transition-transform cursor-pointer disabled:cursor-default disabled:hover:scale-100"
            >
              <PlayIcon />
            </button>
          </PausedOverlay>
        )}
      </AnimatePresence>
    </div>
  );
};

// "How to use Manasi AI" pop-up
const TutorialVideoModal = ({ isOpen, onClose }) => {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="tutorial-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={FADE}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutorial-title"
            initial={{ opacity: 0, transform: "translateY(16px) scale(0.98)" }}
            animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
            exit={{ opacity: 0, transform: "translateY(16px) scale(0.98)" }}
            transition={MODAL_TRANSITION}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: CARD_MAX_WIDTH }}
            className="w-full"
          >
            <TutorialPlayer onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TutorialVideoModal;
