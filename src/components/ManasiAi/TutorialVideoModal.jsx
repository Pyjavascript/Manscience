import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiX } from "react-icons/fi";
import {
  MdCheck,
  MdForward10,
  MdFullscreen,
  MdFullscreenExit,
  MdPause,
  MdPlayArrow,
  MdReplay,
  MdReplay10,
  MdVolumeDown,
  MdVolumeOff,
  MdVolumeUp,
} from "react-icons/md";
import { TUTORIAL_VIDEO_URL } from "./constants";
import { useStableCallback } from "./useStableCallback";

const MODAL_TRANSITION = { duration: 0.3, ease: [0.22, 1, 0.36, 1] };
const FADE = { duration: 0.2 };

// Keeps the 16:9 card inside the viewport on short screens
const CARD_MAX_WIDTH = "min(1260px, calc((100dvh - 6rem) * 16 / 9))";

const SKIP_SECONDS = 10;
const CONTROLS_HIDE_DELAY = 2500;
const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2];

const ROUND_BUTTON_CLASS =
  "w-8 h-8 md:w-9 md:h-9 rounded-full bg-white text-[#B77145] flex items-center justify-center shadow-md hover:scale-105 transition-transform cursor-pointer disabled:cursor-default disabled:hover:scale-100";

const CENTER_BUTTON_CLASS =
  "w-11 h-11 md:w-16 md:h-16 hover:scale-105 transition-transform cursor-pointer disabled:cursor-default disabled:hover:scale-100";

const CONTROL_BUTTON_CLASS =
  "w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition-colors cursor-pointer";

const CONTROL_ICON_CLASS = "w-5 h-5 md:w-6 md:h-6";

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

// 75 -> "1:15", 3725 -> "1:02:05"
const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return "0:00";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, "0");
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}`
    : `${minutes}:${secs}`;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// Progress bar: click or drag to jump, hover to preview the time
const SeekBar = ({
  currentTime,
  duration,
  bufferedEnd,
  isScrubbing,
  onScrubChange,
  onSeek,
}) => {
  const barRef = useRef(null);
  const [hoverRatio, setHoverRatio] = useState(null);

  const ratioAt = (clientX) => {
    const rect = barRef.current.getBoundingClientRect();
    return clamp((clientX - rect.left) / rect.width, 0, 1);
  };

  const handlePointerDown = (e) => {
    if (!duration) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onScrubChange(true);
    onSeek(ratioAt(e.clientX) * duration);
  };

  const handlePointerMove = (e) => {
    const ratio = ratioAt(e.clientX);
    if (e.pointerType !== "touch") setHoverRatio(ratio);
    if (isScrubbing) onSeek(ratio * duration);
  };

  const endScrub = () => {
    if (isScrubbing) onScrubChange(false);
  };

  const playedPct = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration ? (bufferedEnd / duration) * 100 : 0;
  const previewRatio = hoverRatio ?? (isScrubbing ? playedPct / 100 : null);

  return (
    <div
      ref={barRef}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.floor(duration)}
      aria-valuenow={Math.floor(currentTime)}
      aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endScrub}
      onPointerCancel={endScrub}
      onPointerLeave={() => setHoverRatio(null)}
      className="group/seek relative h-4 flex items-center cursor-pointer touch-none outline-none"
    >
      <div
        className={`relative w-full rounded-full bg-white/25 overflow-hidden transition-[height] duration-150 ${isScrubbing ? "h-1.5" : "h-1 group-hover/seek:h-1.5"}`}
      >
        <div
          className="absolute inset-y-0 left-0 bg-white/40"
          style={{ width: `${bufferedPct}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-[#B77145]"
          style={{ width: `${playedPct}%` }}
        />
      </div>

      <div
        className={`absolute w-3 h-3 md:w-3.5 md:h-3.5 -ml-1.5 md:-ml-1.75 rounded-full bg-white shadow transition-transform duration-150 ${isScrubbing ? "scale-100" : "scale-0 group-hover/seek:scale-100 group-focus-visible/seek:scale-100"}`}
        style={{ left: `${playedPct}%` }}
      />

      {previewRatio !== null && duration > 0 && (
        <div
          className="absolute bottom-full mb-2 -translate-x-1/2 px-2 py-1 rounded-md bg-black/80 text-white text-[11px] md:text-xs font-medium tabular-nums pointer-events-none"
          // Kept off the edges so the label never gets clipped
          style={{ left: `clamp(24px, ${previewRatio * 100}%, calc(100% - 24px))` }}
        >
          {formatTime(previewRatio * duration)}
        </div>
      )}
    </div>
  );
};

// Mute button with a slider that slides out on hover (desktop only,
// phones use their hardware buttons)
const VolumeControl = ({ volume, isMuted, onToggleMute, onChange }) => {
  const level = isMuted ? 0 : volume;
  const Icon = level === 0 ? MdVolumeOff : level < 0.5 ? MdVolumeDown : MdVolumeUp;

  return (
    <div className="hidden md:flex items-center group/volume">
      <button
        onClick={onToggleMute}
        aria-label={level === 0 ? "Unmute" : "Mute"}
        title={level === 0 ? "Unmute (m)" : "Mute (m)"}
        className={CONTROL_BUTTON_CLASS}
      >
        <Icon className={CONTROL_ICON_CLASS} />
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={level}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Volume"
        className="w-0 opacity-0 group-hover/volume:w-20 group-hover/volume:opacity-100 focus-visible:w-20 focus-visible:opacity-100 group-hover/volume:mr-2 transition-all duration-200 h-1 accent-white cursor-pointer"
      />
    </div>
  );
};

// "1x" button that opens a list of playback speeds
const SpeedMenu = ({ speed, onChange, isOpen, onOpenChange }) => {
  const menuRef = useRef(null);

  // Close when clicking anywhere else. composedPath() because inside
  // Webflow's shadow root e.target is retargeted to the component's host.
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e) => {
      if (!e.composedPath().includes(menuRef.current)) onOpenChange(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, onOpenChange]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => onOpenChange(!isOpen)}
        aria-label="Playback speed"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="Playback speed"
        className="h-8 md:h-10 min-w-8 md:min-w-10 px-2 rounded-full flex items-center justify-center text-white text-[12px] md:text-[14px] font-semibold tabular-nums hover:bg-white/15 transition-colors cursor-pointer"
      >
        {speed}x
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute bottom-full right-0 mb-2 py-1 min-w-28 rounded-xl bg-black/85 backdrop-blur-sm shadow-lg"
        >
          {PLAYBACK_SPEEDS.map((option) => (
            <button
              key={option}
              role="menuitemradio"
              aria-checked={option === speed}
              onClick={() => {
                onChange(option);
                onOpenChange(false);
              }}
              className="w-full flex items-center justify-between gap-3 px-3 py-1 md:py-1.5 text-left text-white text-[12px] md:text-[13px] hover:bg-white/10 cursor-pointer"
            >
              {option === 1 ? "Normal" : `${option}x`}
              {option === speed && <MdCheck className="w-4 h-4 text-[#E8B48F]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Tutorial video with its own controls: play/pause, 10s back/forward,
// seek bar, volume, speed and fullscreen. Controls fade out while playing
// and come back on mouse move, tap or key press.
const TutorialPlayer = ({ onClose }) => {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hideTimerRef = useRef(null);
  const lastPointerTypeRef = useRef("mouse");
  const seekFlashIdRef = useRef(0);

  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUserActive, setIsUserActive] = useState(true);
  const [seekFlash, setSeekFlash] = useState(null); // { direction, id }

  const hasVideo = Boolean(TUTORIAL_VIDEO_URL);
  const showControls =
    hasStarted &&
    (!isPlaying || isUserActive || isScrubbing || isSpeedMenuOpen);
  const showTopBar = !hasStarted || showControls;
  const titleTextClass = hasStarted
    ? "text-[14px] md:text-[18px]"
    : "text-[22px] md:text-[44px]";

  const revealControls = () => {
    setIsUserActive(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(
      () => setIsUserActive(false),
      CONTROLS_HIDE_DELAY,
    );
  };

  const hideControls = () => {
    clearTimeout(hideTimerRef.current);
    setIsUserActive(false);
  };

  useEffect(() => () => clearTimeout(hideTimerRef.current), []);

  // timeupdate only fires a few times a second, so follow the playhead
  // every frame while playing to keep the progress bar smooth
  useEffect(() => {
    if (!isPlaying) return;
    let frame;
    const tick = () => {
      if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying]);

  // Track fullscreen, and leave it if the pop-up goes away. In a shadow
  // root document.fullscreenElement is the host, so ask the root instead.
  useEffect(() => {
    const handleChange = () => {
      const root = containerRef.current?.getRootNode();
      const element = root?.fullscreenElement ?? document.fullscreenElement;
      setIsFullscreen(Boolean(element) && element === containerRef.current);
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  // The "-10 / +10" bubble disappears on its own
  useEffect(() => {
    if (!seekFlash) return;
    const timer = setTimeout(() => setSeekFlash(null), 600);
    return () => clearTimeout(timer);
  }, [seekFlash]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) video.play().catch(() => {});
    else video.pause();
  };

  const seekTo = (time) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = clamp(time, 0, duration);
    setCurrentTime(video.currentTime);
  };

  const skip = (seconds) => {
    if (!hasStarted || !videoRef.current) return;
    seekTo(videoRef.current.currentTime + seconds);
    seekFlashIdRef.current += 1;
    setSeekFlash({
      direction: seconds < 0 ? "back" : "forward",
      id: seekFlashIdRef.current,
    });
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.muted || video.volume === 0) {
      video.muted = false;
      if (video.volume === 0) video.volume = 1;
    } else {
      video.muted = true;
    }
  };

  const changeVolume = (value) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    video.muted = value === 0;
  };

  const changeSpeed = (value) => {
    if (videoRef.current) videoRef.current.playbackRate = value;
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (container?.requestFullscreen) {
      container.requestFullscreen().catch(() => {});
    } else if (video?.webkitEnterFullscreen) {
      // iPhone Safari can only put the <video> itself in fullscreen
      video.webkitEnterFullscreen();
    }
  };

  const close = () => {
    videoRef.current?.pause();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    onClose();
  };

  // On touch, tapping the video shows/hides the controls instead of pausing
  const handleVideoClick = () => {
    if (lastPointerTypeRef.current === "touch" && hasStarted && isPlaying) {
      if (showControls) hideControls();
      else revealControls();
      return;
    }
    togglePlayback();
  };

  // Keyboard shortcuts, same as most video players
  const handleKeyDown = useStableCallback((e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    // composedPath()[0] is the real focused element, even inside a shadow root
    const tag = e.composedPath()[0]?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    // A focused button handles Space/Enter itself
    if (tag === "BUTTON" && (e.key === " " || e.key === "Enter")) return;

    switch (e.key.toLowerCase()) {
      case " ":
      case "k":
        togglePlayback();
        break;
      case "arrowleft":
      case "j":
        skip(-SKIP_SECONDS);
        break;
      case "arrowright":
      case "l":
        skip(SKIP_SECONDS);
        break;
      case "m":
        toggleMute();
        break;
      case "f":
        toggleFullscreen();
        break;
      default:
        return;
    }
    e.preventDefault();
    revealControls();
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const fadeClass = (visible) =>
    `transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`;

  return (
    <div
      ref={containerRef}
      onPointerMove={(e) => {
        if (e.pointerType !== "touch") revealControls();
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "touch" && isPlaying) hideControls();
      }}
      className={`relative overflow-hidden select-none ${
        isFullscreen
          ? "w-full h-full bg-black"
          : // Taller on phones so the video isn't a thin strip
            "aspect-[4/3] md:aspect-video rounded-3xl md:rounded-[32px] shadow-2xl bg-linear-to-tr from-[#B77145] via-[#D9B89C] to-[#E8D8C6]"
      } ${hasStarted && !showControls ? "cursor-none" : ""}`}
    >
      <h2 id="tutorial-title" className="sr-only">
        How to use Manasi AI
      </h2>

      {hasVideo && (
        <video
          ref={videoRef}
          src={TUTORIAL_VIDEO_URL}
          playsInline
          preload="metadata"
          onPointerDown={(e) => {
            lastPointerTypeRef.current = e.pointerType;
          }}
          onClick={handleVideoClick}
          onDoubleClick={() => {
            if (lastPointerTypeRef.current !== "touch") toggleFullscreen();
          }}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onDurationChange={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onProgress={(e) => {
            const { buffered } = e.currentTarget;
            if (buffered.length) setBufferedEnd(buffered.end(buffered.length - 1));
          }}
          onPlay={() => {
            setHasStarted(true);
            setIsPlaying(true);
            setIsEnded(false);
            revealControls();
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsEnded(true)}
          onSeeked={(e) => setIsEnded(e.currentTarget.ended)}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onCanPlay={() => setIsBuffering(false)}
          onVolumeChange={(e) => {
            setVolume(e.currentTarget.volume);
            setIsMuted(e.currentTarget.muted);
          }}
          onRateChange={(e) => setSpeed(e.currentTarget.playbackRate)}
          className={`absolute inset-0 w-full h-full cursor-pointer ${isFullscreen ? "object-contain" : "object-cover"}`}
        />
      )}

      {/* Darkens the top edge so the white title and close button stay readable */}
      <div
        className={`absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-black/40 to-transparent pointer-events-none ${fadeClass(showTopBar)}`}
      />

      {/* Title and close button on one line: big title on the start
          screen, a small one once the video has started */}
      <div
        className={`absolute inset-x-0 top-0 flex items-start justify-between gap-4 px-5 pt-5 md:px-9 md:pt-10 pointer-events-none ${fadeClass(showTopBar)}`}
      >
        <p
          aria-hidden="true"
          className={`min-w-0 text-white font-medium leading-[1.15] tracking-[-2%] ${titleTextClass} ${hasStarted ? "truncate" : ""}`}
        >
          {hasStarted ? (
            "How to use Manasi AI"
          ) : (
            <>
              How to use
              <br />
              Manasi AI.
            </>
          )}
        </p>

        {/* One title line tall, so the button centres on the first line */}
        <div
          className={`shrink-0 h-[1.15em] flex items-center leading-[1.15] ${titleTextClass}`}
        >
          <button
            onClick={close}
            aria-label="Close video"
            title="Close"
            className={`pointer-events-auto ${ROUND_BUTTON_CLASS}`}
          >
            <FiX size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Start screen play button */}
      <AnimatePresence>
        {!hasStarted && (
          <motion.div
            key="start-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE}
          >
            <button
              onClick={togglePlayback}
              disabled={!hasVideo}
              aria-label="Play video"
              title={hasVideo ? "Play (k)" : "Video coming soon"}
              className={`absolute inset-0 m-auto ${CENTER_BUTTON_CLASS}`}
            >
              <PlayIcon />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Replay once the video has finished */}
      {hasStarted && isEnded && (
        <button
          onClick={togglePlayback}
          aria-label="Replay video"
          title="Replay"
          className={`absolute inset-0 m-auto ${CENTER_BUTTON_CLASS} rounded-full bg-white text-[#B77145] flex items-center justify-center shadow-md`}
        >
          <MdReplay className="w-6 h-6 md:w-9 md:h-9" />
        </button>
      )}

      {isPlaying && isBuffering && (
        <div className="absolute inset-0 m-auto w-10 h-10 md:w-14 md:h-14 rounded-full border-[3px] border-white/30 border-t-white animate-spin pointer-events-none" />
      )}

      {/* "10 seconds back / forward" bubble */}
      <AnimatePresence>
        {seekFlash && (
          <motion.div
            key={seekFlash.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE}
            className={`absolute inset-y-0 flex items-center pointer-events-none ${seekFlash.direction === "back" ? "left-[12%]" : "right-[12%]"}`}
          >
            <motion.div
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              transition={FADE}
              className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-black/45 text-white flex items-center justify-center"
            >
              {seekFlash.direction === "back" ? (
                <MdReplay10 className="w-7 h-7 md:w-10 md:h-10" />
              ) : (
                <MdForward10 className="w-7 h-7 md:w-10 md:h-10" />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom control bar */}
      <div
        onFocus={revealControls}
        className={`absolute inset-x-0 bottom-0 px-3 md:px-6 pt-10 md:pt-16 pb-1.5 md:pb-4 bg-linear-to-t from-black/60 to-transparent ${fadeClass(showControls)}`}
      >
        <SeekBar
          currentTime={currentTime}
          duration={duration}
          bufferedEnd={bufferedEnd}
          isScrubbing={isScrubbing}
          onScrubChange={setIsScrubbing}
          onSeek={seekTo}
        />

        <div className="flex items-center justify-between gap-2 mt-0.5 md:mt-1.5">
          <div className="flex items-center gap-0.5 md:gap-1 min-w-0">
            <button
              onClick={togglePlayback}
              aria-label={isPlaying ? "Pause" : "Play"}
              title={isPlaying ? "Pause (k)" : "Play (k)"}
              className={CONTROL_BUTTON_CLASS}
            >
              {isPlaying ? (
                <MdPause className={CONTROL_ICON_CLASS} />
              ) : (
                <MdPlayArrow className={CONTROL_ICON_CLASS} />
              )}
            </button>
            <button
              onClick={() => skip(-SKIP_SECONDS)}
              aria-label="Back 10 seconds"
              title="Back 10 seconds (←)"
              className={CONTROL_BUTTON_CLASS}
            >
              <MdReplay10 className={CONTROL_ICON_CLASS} />
            </button>
            <button
              onClick={() => skip(SKIP_SECONDS)}
              aria-label="Forward 10 seconds"
              title="Forward 10 seconds (→)"
              className={CONTROL_BUTTON_CLASS}
            >
              <MdForward10 className={CONTROL_ICON_CLASS} />
            </button>

            <VolumeControl
              volume={volume}
              isMuted={isMuted}
              onToggleMute={toggleMute}
              onChange={changeVolume}
            />

            <span className="ml-1 md:ml-2 text-white text-[11px] md:text-[14px] font-medium tabular-nums whitespace-nowrap">
              {formatTime(currentTime)}
              <span className="text-white/60"> / {formatTime(duration)}</span>
            </span>
          </div>

          <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
            <SpeedMenu
              speed={speed}
              onChange={changeSpeed}
              isOpen={isSpeedMenuOpen}
              onOpenChange={setIsSpeedMenuOpen}
            />
            <button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
              title={isFullscreen ? "Exit full screen (f)" : "Full screen (f)"}
              className={CONTROL_BUTTON_CLASS}
            >
              {isFullscreen ? (
                <MdFullscreenExit className={CONTROL_ICON_CLASS} />
              ) : (
                <MdFullscreen className={CONTROL_ICON_CLASS} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// "How to use Manasi AI" pop-up
const TutorialVideoModal = ({ isOpen, onClose }) => {
  // Close on Escape (in fullscreen, Escape only leaves fullscreen)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !document.fullscreenElement) onClose();
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 bg-white/70 backdrop-blur-xs"
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
