import ai from "../../assets/Ai/ai.svg";

const WelcomeScreen = () => (
  <main className="flex-1 min-h-0 flex flex-col gap-5 md:gap-10 items-center justify-center text-center max-w-3xl w-full mx-auto px-2 mainBox">
    <div>
      <img src={ai} alt="Logo" className="md:h-19.5 h-12.5" />
    </div>

    <div className="flex flex-col justify-center items-center gap-5">
      <h1 className="text-[30px] md:text-[54px] font-normal text-white tracking-tight leading-[1.1]">
        Meet Manasi!
        <br />
        Your AI Brain Guide.
      </h1>
      <p className="text-white text-[15px] md:text-[15px] sm:text-normal max-w-75 md:max-w-xs tracking-tight leading-normal">
        Maanasi translates complex neuroscience into simple, personalized
        guidance.
      </p>
    </div>
  </main>
);

export default WelcomeScreen;
