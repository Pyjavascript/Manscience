import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const MENU_TRANSITION = { duration: 0.18, ease: [0.22, 1, 0.36, 1] };

const ChevronDown = ({ isOpen }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    className={`shrink-0 text-[#B77145] transition-transform duration-200 ${
      isOpen ? "rotate-180" : ""
    }`}
  >
    <path
      d="M4 6l4 4 4-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    className="shrink-0 text-[#B77145]"
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

// Custom select: a field-style trigger that opens a rounded menu of options.
// Works with mouse, touch and keyboard (arrows, Enter/Space, Escape, Tab).
const SelectDropdown = ({
  value,
  onChange,
  options,
  placeholder,
  triggerClassName = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listId = useId();

  // Close when clicking or tapping anywhere outside the dropdown
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const open = () => {
    setActiveIdx(Math.max(0, options.indexOf(value)));
    setIsOpen(true);
  };

  const choose = (opt) => {
    onChange(opt);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        open();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % options.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + options.length) % options.length);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (activeIdx >= 0) choose(options[activeIdx]);
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      case "Tab":
        setIsOpen(false);
        break;
      default:
    }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-label={placeholder}
        aria-activedescendant={
          isOpen && activeIdx >= 0 ? `${listId}-${activeIdx}` : undefined
        }
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={handleKeyDown}
        className={`${triggerClassName} flex items-center justify-between gap-2 text-left cursor-pointer`}
      >
        <span className={`truncate ${value ? "" : "text-[#B77145]"}`}>
          {value || placeholder}
        </span>
        <ChevronDown isOpen={isOpen} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            id={listId}
            role="listbox"
            aria-label={placeholder}
            initial={{ opacity: 0, transform: "translateY(-6px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0, transform: "translateY(-6px)" }}
            transition={MENU_TRANSITION}
            className="absolute left-0 min-w-full w-max top-full mt-1.5 z-20 p-1.5 bg-white rounded-[20px] shadow-[0_12px_32px_rgba(104,39,11,0.18)] flex flex-col gap-0.5"
          >
            {options.map((opt, idx) => {
              const isSelected = opt === value;
              const isActive = idx === activeIdx;
              return (
                <li
                  key={opt}
                  id={`${listId}-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => choose(opt)}
                  className={`flex items-center justify-between gap-2 px-3.5 h-10 md:h-11 rounded-[14px] text-[14px] font-semibold cursor-pointer transition-colors duration-150 ${
                    isSelected
                      ? "bg-[#FAF4E8] text-[#68270B]"
                      : isActive
                        ? "bg-[#FAF4E8]/60 text-[#68270B]"
                        : "text-[#B77145]"
                  }`}
                >
                  <span className="whitespace-nowrap">{opt}</span>
                  {isSelected && <CheckIcon />}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SelectDropdown;
