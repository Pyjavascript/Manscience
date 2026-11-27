import ai from "../../assets/Ai/ai.svg";

// Greeting shown above the input until the first message is sent.
// Sizes are in px, not Tailwind's rem scale: Webflow sets <html> to 14px on
// desktop, which would shrink rem values and wrap the paragraph to 3 lines.
const WelcomeScreen = () => (
  <div className="flex flex-col gap-[20px] md:gap-[40px] items-center text-center max-w-[768px] w-full mx-auto px-[8px] pb-[8px] md:pb-[16px]">
    <div>
      <img src="https://res.cloudinary.com/dspwbbjyt/image/upload/v1795769893/ai-gif_ctnktq.gif" alt="Logo" className="h-[50px] md:h-[78px]" />
    </div>

    <div className="flex flex-col justify-center items-center gap-[20px]">
      <h1 className="text-[30px] md:text-[54px] font-normal text-white tracking-normal leading-[1.1]">
        Meet Manasi!
        <br />
        Your AI Brain Guide.
      </h1>
      <p className="text-white text-[15px] max-w-[300px] md:max-w-[340px] tracking-normal leading-normal">
        Manasi translates complex neuroscience into simple, personalized
        guidance.
      </p>
    </div>
  </div>
);

export default WelcomeScreen;
