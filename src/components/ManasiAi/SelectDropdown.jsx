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

// Next ancestor, stepping out of a shadow root (Webflow) to its host
const parentOf = (node) => node.parentElement ?? node.getRootNode().host ?? null;

// Scrolls the containers around `field` just enough that `menu` sits inside
// the visible area (the visual viewport, which excludes the phone keyboard),
// without pushing the field itself off the top
const revealInView = (field, menu) => {
  if (!field || !menu) return;
  const MARGIN = 12;
  const vv = window.visualViewport;
  const viewTop = vv ? vv.offsetTop : 0;
  const viewBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
  const fieldTop = field.getBoundingClientRect().top;
  const menuBottom = menu.getBoundingClientRect().bottom;

  let remaining = Math.min(
    menuBottom + MARGIN - viewBottom,
    fieldTop - MARGIN - viewTop,
  );
  if (remaining <= 0) return;

  // Inner scroll areas first, then the page
  for (let node = parentOf(field); node && remaining > 0; node = parentOf(node)) {
    const isPage = node === document.documentElement;
    if (!isPage && !/(auto|scroll|overlay)/.test(getComputedStyle(node).overflowY))
      continue;
    const room = node.scrollHeight - node.clientHeight - node.scrollTop;
    const step = Math.min(remaining, room);
    if (step <= 0) continue;
    if (isPage) window.scrollBy({ top: step, behavior: "smooth" });
    else node.scrollBy({ top: step, behavior: "smooth" });
    remaining -= step;
  }
};

// Custom select: a field-style trigger that opens a rounded menu of options.
// Works with mouse, touch and keyboard (arrows, Enter/Space, Escape, Tab,
// and typing letters to jump to a matching option).
// matchTriggerWidth keeps the menu as wide as the field (long options are
// cut off with an ellipsis) so it never runs off the screen.
// searchable turns the field into a text box: what you type shows in the
// field and filters the list.
const SelectDropdown = ({
  value,
  onChange,
  options,
  placeholder,
  triggerClassName = "",
  matchTriggerWidth = false,
  searchable = false,
  shortList = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  // Text typed in a searchable field; null until the user types
  const [query, setQuery] = useState(null);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const typeahead = useRef({ text: "", timer: null });
  const listId = useId();

  // Options matching the typed text, those starting with it first
  const search = query?.trim().toLowerCase();
  const shownOptions = search
    ? [
        ...options.filter((opt) => opt.toLowerCase().startsWith(search)),
        ...options.filter((opt) => {
          const lower = opt.toLowerCase();
          return !lower.startsWith(search) && lower.includes(search);
        }),
      ]
    : options;

  // Keep the highlighted option visible in long, scrolling lists.
  // Scrolls only the menu: scrollIntoView would also scroll the page.
  useEffect(() => {
    const list = listRef.current;
    const item = list?.children[activeIdx];
    if (!isOpen || !item) return;
    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight)
      list.scrollTop = bottom - list.clientHeight;
  }, [isOpen, activeIdx]);

  // On open, scroll so the field and its menu are fully visible — above
  // the phone keyboard too. Re-checks while the keyboard slides up.
  useEffect(() => {
    if (!isOpen) return;
    let timer;
    const reveal = () => revealInView(rootRef.current, menuRef.current);
    const revealSoon = () => {
      clearTimeout(timer);
      timer = setTimeout(reveal, 120);
    };
    const frame = requestAnimationFrame(reveal);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", revealSoon);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      vv?.removeEventListener("resize", revealSoon);
    };
  }, [isOpen]);

  useEffect(() => () => clearTimeout(typeahead.current.timer), []);

  // Typing letters jumps to the first option starting with them
  const jumpTo = (char) => {
    const t = typeahead.current;
    clearTimeout(t.timer);
    t.text += char.toLowerCase();
    t.timer = setTimeout(() => (t.text = ""), 600);
    const idx = options.findIndex((opt) => opt.toLowerCase().startsWith(t.text));
    if (idx >= 0) setActiveIdx(idx);
  };

  // Closing drops the typed text. If it exactly names an option
  // (e.g. "india"), that option is picked so the typing isn't lost.
  const close = () => {
    const typed = query?.trim().toLowerCase();
    const exact = typed && options.find((opt) => opt.toLowerCase() === typed);
    if (exact && exact !== value) onChange(exact);
    setQuery(null);
    setIsOpen(false);
  };

  // Close when clicking or tapping anywhere outside the dropdown.
  // Re-subscribes each render so close() sees the latest typed text.
  // composedPath() because inside Webflow's shadow root e.target is
  // retargeted to the component's host, so every touch (even scrolling
  // the list) would otherwise count as "outside".
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e) => {
      if (!e.composedPath().includes(rootRef.current)) close();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  });

  // A searchable field empties on open (current choice stays as the
  // placeholder) so typing starts fresh instead of appending to it
  const open = () => {
    setQuery(searchable ? "" : null);
    setActiveIdx(Math.max(0, options.indexOf(value)));
    setIsOpen(true);
  };

  const choose = (opt) => {
    onChange(opt);
    setQuery(null);
    setIsOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  const handleSearchChange = (e) => {
    setQuery(e.target.value);
    setActiveIdx(0);
    setIsOpen(true);
  };

  // Searchable field: arrows move through the matches, Enter picks one,
  // every other key types into the field
  const handleSearchKeyDown = (e) => {
    const count = shownOptions.length;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        if (!isOpen) {
          open();
          break;
        }
        if (!count) break;
        const step = e.key === "ArrowDown" ? 1 : -1;
        setActiveIdx((i) => (i + step + count) % count);
        break;
      }
      case "Enter":
        e.preventDefault();
        if (!isOpen) open();
        else if (shownOptions[activeIdx]) choose(shownOptions[activeIdx]);
        break;
      case "Escape":
        if (isOpen) {
          e.preventDefault();
          close();
        }
        break;
      case "Tab":
        if (isOpen) close();
        break;
      default:
    }
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
        e.preventDefault();
        if (activeIdx >= 0) choose(options[activeIdx]);
        break;
      case " ":
        e.preventDefault();
        // Space continues a typed search ("New York"), otherwise selects
        if (typeahead.current.text) jumpTo(" ");
        else if (activeIdx >= 0) choose(options[activeIdx]);
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      case "Tab":
        setIsOpen(false);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          jumpTo(e.key);
        }
    }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      {searchable ? (
        <div
          onClick={() => {
            triggerRef.current?.focus({ preventScroll: true });
            if (!isOpen) open();
          }}
          className={`${triggerClassName} flex items-center justify-between gap-2 cursor-text`}
        >
          <input
            ref={triggerRef}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls={listId}
            aria-label={placeholder}
            aria-activedescendant={
              isOpen && shownOptions[activeIdx]
                ? `${listId}-${activeIdx}`
                : undefined
            }
            autoComplete="off"
            spellCheck={false}
            value={query ?? value}
            placeholder={value || placeholder}
            onChange={handleSearchChange}
            onFocus={(e) => e.target.select()}
            onKeyDown={handleSearchKeyDown}
            className="flex-1 min-w-0 w-full bg-transparent outline-none truncate placeholder:text-[#B77145]"
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={isOpen ? "Close list" : "Open list"}
            onClick={(e) => {
              e.stopPropagation();
              if (isOpen) close();
              else {
                triggerRef.current?.focus({ preventScroll: true });
                open();
              }
            }}
            className="shrink-0 -mr-1 p-1 cursor-pointer"
          >
            <ChevronDown isOpen={isOpen} />
          </button>
        </div>
      ) : (
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
      )}

      <AnimatePresence>
        {isOpen && (
          // The white rounded card stays fixed; only the list inside scrolls,
          // so the padding and round corners never scroll away
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, transform: "translateY(-6px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0, transform: "translateY(-6px)" }}
            transition={MENU_TRANSITION}
            className={`absolute left-0 top-full mt-1.5 z-20 p-1.5 bg-white rounded-[20px] rounded-b-[24px] shadow-[0_12px_32px_rgba(104,39,11,0.18)] overflow-hidden ${
              matchTriggerWidth ? "w-full" : "min-w-full w-max"
            }`}
          >
          {/* Max height fits exactly 6 whole options (3 with shortList),
              so none is cut off */}
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={placeholder}
            className={`relative ${
              shortList
                ? "max-h-[124px] md:max-h-[136px]"
                : "max-h-[250px] md:max-h-[274px]"
            } overflow-y-auto overscroll-contain rounded-[14px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col gap-0.5`}
          >
            {shownOptions.length === 0 && (
              <li className="shrink-0 flex items-center px-3.5 h-10 md:h-11 text-[14px] font-semibold text-[#B77145]/70">
                No matches
              </li>
            )}
            {shownOptions.map((opt, idx) => {
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
                  className={`shrink-0 flex items-center justify-between gap-2 px-3.5 h-10 md:h-11 rounded-[14px] text-[14px] font-semibold cursor-pointer transition-colors duration-150 ${
                    isSelected
                      ? "bg-[#FAF4E8] text-[#68270B]"
                      : isActive
                        ? "bg-[#FAF4E8]/60 text-[#68270B]"
                        : "text-[#B77145]"
                  }`}
                >
                  <span
                    className={`whitespace-nowrap ${matchTriggerWidth ? "truncate" : ""}`}
                    title={matchTriggerWidth ? opt : undefined}
                  >
                    {opt}
                  </span>
                  {isSelected && <CheckIcon />}
                </li>
              );
            })}
          </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SelectDropdown;
