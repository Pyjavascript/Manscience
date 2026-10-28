import inparrow from "../../assets/Ai/inparrow.svg";

// Message input and disclaimer
const ChatComposer = ({
  showInput,
  userInput,
  onInputChange,
  onKeyDown,
  onSend,
  inputDisabled,
  sendDisabled,
}) => (
  <div className="w-full max-w-3xl mx-auto space-y-4 bg-transparent p-4">
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
