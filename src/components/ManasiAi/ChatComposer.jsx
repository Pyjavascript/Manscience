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
  <div className="w-full max-w-[768px] mx-auto space-y-[16px] bg-transparent p-[16px]">
    {showInput && (
      <div className="md:w-[600px] min-h-[60px] md:min-h-[80px] rounded-[24px] md:rounded-[34px] px-[15px] py-[10px] md:py-[16px] md:px-[24px] max-w-[672px] mx-auto bg-white text-gray-900 flex justify-between items-center gap-[8px]">
        <textarea
          rows={1}
          placeholder="What would you like help with?"
          value={userInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={inputDisabled}
          className="placeholder:text-black w-full text-[13px] md:text-[18px] font-semibold text-gray-800 bg-transparent resize-none focus:outline-none focus:ring-0 border-none p-0 field-sizing-content max-h-[144px] overflow-y-auto scrollbar-none "
        />
        <button
          onClick={() => onSend()}
          disabled={sendDisabled}
          className="w-[44px] md:w-[48px] md:h-[45px] h-[38px] shrink-0 rounded-full bg-[#B77145] hover:bg-amber-800 disabled:bg-amber-700/40 flex items-center justify-center text-white transition"
        >
          <img src={inparrow} alt="send" className="-rotate-45 h-[12px]" />
        </button>
      </div>
    )}

    {showInput && (
      <footer className="w-full text-center pb-[8px] pt-[4px]">
        <p className="text-[13px] font-normal md:text-[14px] text-white max-w-[448px] md:max-w-max mx-auto px-[16px]">
          Manasi AI can make mistakes, kindly consult a certified practitioner.
        </p>
      </footer>
    )}
  </div>
);

export default ChatComposer;
