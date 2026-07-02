import { useState, useRef, useEffect } from "react";
import ai from "../assets/Ai/ai.svg";
import arrow from "../assets/Ai/arrow.svg";
import thunder from "../assets/Ai/thunder.svg";
import ball from "../assets/Ai/ball.svg";
import cube from "../assets/Ai/cube.svg";
import inparrow from "../assets/Ai/inparrow.svg";
import bg from "../assets/Ai/bg.svg";
import BackG from "../assets/Ai/BackG.png";

const CHAT_ENDPOINT =
  "https://obzogpozgoolhededqkb.supabase.co/functions/v1/chat-handler";

const ManasiAi = () => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]); // { role: 'user' | 'assistant', content: string }
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const scrollRef = useRef(null);
  // let CHAT_ENDPOINT = "http://127.0.0.1:8000/chat";
  let CHAT_ENDPOINT = "https://manasi-production.up.railway.app/chat";

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      setSessionId(crypto.randomUUID());
    } else {
      setSessionId("session_" + Math.random().toString(36).substring(2, 11));
    }
  }, []);

  const sendMessage = async (textOverride) => {
    const text = (textOverride ?? userInput).trim();
    if (!text || isLoading) return;

    const userMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");
    setIsLoading(true);

    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: "your-session-id", // Explicitly tracking a string helps retain history context!
        }),
      });

      const data = await response.json();

      // Update state to include the optional cta object returned from the backend
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer ?? "Sorry, I couldn't get a response.", // Wire up 'data.answer' matching your Python Backend response schema
          cta: data.cta ?? null, // Store the nested cta dictionary here
        },
      ]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const hasConversation = messages.length > 0;

  return (
    <div
      className="h-screen  w-full text-white flex flex-col  p-4 md:p-6 select-none manrope"
      style={{
        backgroundImage: `url(${BackG})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {!hasConversation ? (
        <main className="flex-1 min-h-0 flex flex-col gap-5 md:gap-15 items-center justify-center text-center max-w-3xl w-full mx-auto px-2  mainBox">
          <div className=" text-white/90 opacity-80">
            <img src={ai} alt="Logo" />
          </div>

          <div>
            <h1 className="text-[28px] md:text-[44px] font-normal text-white mb-2 tracking-tight">
              Hi, I am Manasi!
            </h1>
            <p className="text-white/80 text-[13px] md:text-[18px] sm:text-base max-w-sm">
              Here to provide better guidance.
            </p>
          </div>
        </main>
      ) : (
        <main className="flex-1 overflow-y-auto flex flex-col gap-6 max-w-2xl w-full mx-auto px-2 pt-4 mainBox">
          {messages.map((msg, index) => {
            const time =
              msg.time ??
              new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

            return msg.role === "assistant" ? (
              <div
                key={index}
                className="flex flex-col items-start gap-3 max-w-[85%] "
              >
                <img src={ai} alt="Manasi" className="w-6 h-6" />

                {/* Text Box */}
                <div className="text-white bg-white/10 text-[15px] leading-relaxed text-left px-4 py-3 rounded-[30px] flex flex-col gap-3">
                  <p>{msg.content}</p>

                  {/* Dynamic CTA Button Insertion */}
                  <div className="flex gap-2">
                    {msg.cta && msg.cta.cta_found && msg.cta.cta_url && (
                    <a
                      href={msg.cta.cta_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 self-start flex items-center gap-2  bg-[#B05A36] text-white font-normal text-[14px] px-5 py-3 rounded-full transition w-auto"
                    >
                      <span className="manrope">{msg.cta.cta_trigger || "Learn More"}</span>
                      <img
                        src={inparrow}
                        alt="link"
                        className="w-[18px] h-[18px] rotate-60 brightness-200"
                      />
                    </a>
                  )}
                  {msg.cta && msg.cta.cta_found && msg.cta.cta_category == "Condition" && (
                    <a
                      href={msg.cta.cta_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 self-start flex items-center gap-2  bg-[#B05A36] text-white font-normal text-[14px] px-5 py-3 rounded-full transition w-auto"
                    >
                      <span className="manrope">Get a Roadmap</span>
                      <img
                        src={inparrow}
                        alt="link"
                        className="w-[18px] h-[18px] rotate-60 brightness-200"
                      />
                    </a>
                  )}
                  </div>
                </div>

                <span className="text-[10px] text-white/50">{time} ✓✓</span>
              </div>
            ) : (
              <div
                key={index}
                className="flex flex-col items-end gap-2 self-end max-w-[85%]"
              >
                <div className="px-4 py-3 rounded-full text-sm leading-relaxed bg-[#B05A36] text-white text-left">
                  {msg.content}
                </div>
                <span className="text-[10px] text-white/50">{time} ✓✓</span>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex flex-col items-start gap-2 max-w-[85%]">
              <img src={ai} alt="Manasi" className="w-6 h-6" />
              <p className="text-white text-[15px]">Thinking...</p>
            </div>
          )}

          <div ref={scrollRef} />
        </main>
      )}

      <div className="w-full max-w-3xl mx-auto space-y-4 bg-transparent mt-auto sticky bottom-0">
        {!isLoading && !hasConversation && (
          <div className="w-full flex items-center gap-2 overflow-x-auto flex-nowrap md:justify-center pb-2 px-1 scrollbar-none snap-x snap-mandatory">
            <button
              onClick={() => sendMessage("Help me navigate neuroplasticity")}
              className="snap-center shrink-0 flex items-center justify-between gap-2  px-3.75 py-3 rounded-[20px] text-xs sm:text-sm text-white/90 transition bg-[#B05A36]"
            >
              <div className="flex gap-1.5 items-center">
                <span className="w-4.25 h-4.25 rounded-full">
                  <img src={thunder} alt="icon" className="text-[#B05A36]" />
                </span>
                <p className="font-semibold text-[10px] w-1/2 text-left">
                  Navigate Neuroplasticity
                </p>
              </div>
              <span className="text-[10px] bg-white rounded-full  p-2 flex items-center justify-center">
                <img
                  src={arrow}
                  alt="send"
                  className="text-[#B05A36] rotate-60"
                />
              </span>
            </button>

            <button
              onClick={() => sendMessage("Help me understand therapies")}
              className="snap-center shrink-0 flex items-center justify-between gap-2  px-3.75 py-3 rounded-[20px] text-xs sm:text-sm text-white/90 transition bg-[#B05A36]"
            >
              <div className="flex gap-1.5 items-center">
                <span className="w-4.25 h-4.25 rounded-full">
                  <img src={ball} alt="icon" className="text-[#B05A36]" />
                </span>
                <p className="font-semibold text-[10px] w-1/2 text-left">
                  Understand Therapies
                </p>
              </div>
              <span className="text-[10px] bg-white rounded-full  p-2 flex items-center justify-center">
                <img
                  src={arrow}
                  alt="send"
                  className="text-[#B05A36] rotate-60"
                />
              </span>
            </button>
            <button
              onClick={() => sendMessage("Give me my personalized roadmap")}
              className="snap-center shrink-0 flex items-center justify-between gap-2  px-3.75 py-3 rounded-[20px] text-xs sm:text-sm text-white/90 transition bg-[#B05A36]"
            >
              <div className="flex gap-1.5 items-center">
                <span className="w-4.25 h-4.25 rounded-full">
                  <img src={cube} alt="icon" className="text-[#B05A36]" />
                </span>
                <p className="font-semibold text-[10px] w-2/3 text-left">
                  Get your personalized roadmap
                </p>
              </div>
              <span className="text-[10px] bg-white rounded-full  p-2 flex items-center justify-center">
                <img
                  src={arrow}
                  alt="send"
                  className="text-[#B05A36] rotate-60"
                />
              </span>
            </button>
          </div>
        )}

        <div className="w-full rounded-[30px] px-5 py-4.5 md:px-6.25 max-w-2xl mx-auto bg-white text-gray-900 p-4 shadow-2xl text-left">
          <textarea
            rows="1"
            placeholder="What would you like help with?"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="placeholder:text-black w-full text-[18px] font-semibold text-gray-800 bg-transparent resize-none focus:outline-none focus:ring-0 border-none p-0"
          ></textarea>

          <div className="flex items-center justify-between gap-2 mt-2 pt-2 ">
            <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition font-medium">
              <span className="text-sm font-bold">+</span> Add Files
            </button>

            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !userInput.trim()}
              className="w-9 h-9 rounded-full bg-amber-700 hover:bg-amber-800 disabled:bg-amber-700/40 flex items-center justify-center text-white transition shadow-sm"
            >
              <img src={inparrow} alt="send" />
            </button>
          </div>
        </div>

        <footer className="w-full text-center pb-2 pt-1">
          <p className="text-[9px] md:text-[13px] text-md  text-white max-w-md mx-auto px-4">
            Manasi AI can make mistakes, kindly consult a certified
            practitioner.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default ManasiAi;
