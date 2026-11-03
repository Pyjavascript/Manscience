import { motion } from "framer-motion";
import { BRAIN_IMAGE_URL } from "./constants";

const RoadmapCompleted = ({ isLoading, onSubmit, error }) => (
  <main className="flex-1 min-h-0 flex flex-col justify-center items-center text-center max-w-[480px] w-full mx-auto px-4 my-auto">
    <motion.div
      initial={{ opacity: 0, transform: "scale(0.95)" }}
      animate={{ opacity: 1, transform: "scale(1)" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full bg-[#68270B]/20 rounded-[36px] p-3 text-white flex flex-col items-center gap-6 overflow-hidden relative"
    >
      <img
        src={BRAIN_IMAGE_URL}
        alt="Brain Illustration"
        className="w-full h-auto object-cover rounded-[28px]"
      />

      <div className="flex flex-col items-center gap-3 px-4">
        <span className="text-[14px] md:text-[16px] font-normal text-white/85 tracking-[2%]">
          Thank You
        </span>
        <h2 className="text-[26px] md:text-[32px] font-medium leading-[1.15] text-white tracking-[-3%] text-balance">
          Roadmap Completed!
        </h2>
        <p className="text-[14px] md:text-[15px] text-white/85 leading-normal max-w-85 font-normal text-balance">
          Personalised information & practitioners will reach out within
          3–5&nbsp;days.
        </p>
      </div>

      <button
        onClick={onSubmit}
        disabled={isLoading}
        className="w-full bg-[#68270B] hover:bg-[#521e08] text-white font-medium py-3.5 md:py-4 rounded-full text-[16px] md:text-[18px] transition duration-200 active:scale-98 cursor-pointer disabled:opacity-50"
      >
        {isLoading ? "Submitting" : "Submit"}
      </button>

      {error && (
        <p className="text-[12px] md:text-[14px] text-white/90 pb-2 px-4">
          {error}
        </p>
      )}
    </motion.div>
  </main>
);

export default RoadmapCompleted;
