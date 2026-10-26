import { motion } from "framer-motion";
import { BRAIN_IMAGE_URL } from "./constants";

const RoadmapCompleted = ({ isLoading, onSubmit, error }) => (
  <main className="flex-1 min-h-0 flex flex-col justify-center items-center text-center max-w-md w-full mx-auto px-4 my-auto">
    <motion.div
      initial={{ opacity: 0, transform: "scale(0.95)" }}
      animate={{ opacity: 1, transform: "scale(1)" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full bg-[#68270B]/20 rounded-[40px] p-2.5 text-white flex flex-col items-center gap-4.5 overflow-hidden relative"
    >
      <div className="w-full flex items-center justify-center relative min-h-45">
        <img
          src={BRAIN_IMAGE_URL}
          alt="Brain Illustration"
          className="object-cover"
        />
      </div>

      <div className="flex flex-col items-center gap-7 px-2">
        <div className="flex flex-col items-center gap-2.5">
          <span className="text-[16px] font-regular text-white tracking-[2%]">
            Thank You
          </span>
          <h2 className="text-[28px] md:text-[36px] font-medium leading-[1.2] text-white tracking-[-3%]">
            Roadmap Completed!
          </h2>
        </div>
        <p className="text-[12px] md:text-[14px] text-white leading-[1.3] max-w-70 font-normal">
          Personalised information & Practitioners will reach out within
          3-5days.
        </p>
      </div>

      <button
        onClick={onSubmit}
        disabled={isLoading}
        className="w-full bg-[#68270B] hover:bg-[#521e08] text-white font-medium py-4 rounded-full text-[16px] md:text-[20px] transition duration-200 active:scale-98 cursor-pointer disabled:opacity-50"
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
