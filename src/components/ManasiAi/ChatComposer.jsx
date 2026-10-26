import arrow from "../../assets/Ai/arrow.svg";
import inparrow from "../../assets/Ai/inparrow.svg";
import { SUGGESTIONS } from "./constants";

const SuggestionChips = ({ onSend }) => (
  <div className="w-full flex items-center gap-3.5 md:overflow-visible overflow-x-auto flex-nowrap md:justify-center pb-2 px-1 scrollbar-none snap-x snap-mandatory">
    {SUGGESTIONS.map(({ label, message }) => (
      <button
        key={label}
        onClick={() => onSend(message)}
        className="snap-center shrink-0 flex items-center justify-between gap-4.5 px-7.5 py-5 text-[14px] font-medium md:text-sm text-white/90 transition bg-[#68270B]/11 rounded-3xl md:rounded-[34px] md:px-9.5 md:py-6.25 cursor-pointer"
      >
        <p className="md:text-[14px] tracking-[-3%] text-left leading-normal">
          {label}
        </p>
        <span>
          <img src={arrow} alt="send" />
        </span>
      </button>
    ))}
  </div>
);

// Bottom area: suggestion chips, message input and disclaimer
const ChatComposer = ({
  showSuggestions,
  showInput,
  userInput,
  onInputChange,
  onKeyDown,
  onSend,
  inputDisabled,
  sendDisabled,
}) => (
  <div className="w-full max-w-3xl mx-auto space-y-4 bg-transparent mt-auto sticky bottom-0 p-4">
    {showSuggestions && <SuggestionChips onSend={onSend} />}

    {showInput && (
      <div className="md:w-150 min-h-15 md:min-h-20 rounded-3xl md:rounded-[34px] px-3.75 py-2.5 md:py-4 md:px-6 max-w-2xl mx-auto bg-white text-gray-900 flex justify-between items-center gap-2">
        <textarea
          rows={1}
          placeholder="What would you like help with?"
          value={userInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={inputDisabled}
          className="placeholder:text-black w-full text-[13px] md:text-[18px] font-semibold text-gray-800 bg-transparent resize-none focus:outline-none focus:ring-0 border-none p-0 field-sizing-content max-h-36 overflow-y-auto scrollbar-none "
        />
        <button
          onClick={() => onSend()}
          disabled={sendDisabled}
          className="w-11 md:w-12 md:h-11.25 h-9.5 rounded-full bg-[#B77145] hover:bg-amber-800 disabled:bg-amber-700/40 flex items-center justify-center text-white transition"
        >
          <img src={inparrow} alt="send" className="-rotate-45 h-3" />
        </button>
      </div>
    )}

    {showInput && (
      <footer className="w-full text-center pb-2 pt-1">
        <p className="text-[13px] font-normal md:text-[14px] text-white max-w-md md:max-w-max mx-auto px-4">
          Manasi AI can make mistakes, kindly consult a certified practitioner.
        </p>
      </footer>
    )}
  </div>
);

export default ChatComposer;
