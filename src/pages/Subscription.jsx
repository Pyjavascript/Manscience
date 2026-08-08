import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import tick from "../assets/tick.svg";

export default function Subscription() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [selectedTab, setSelectedTab] = useState("starter");
  const [loading, setLoading] = useState(true);
  const [activeLoadingPlanId, setActiveLoadingPlanId] = useState(null);

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const popupRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setIsPopupOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    loadSubscription();
  }, []);

  async function loadSubscription() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    setSubscription(data);
    setLoading(false);
  }

  async function buyPlan(planId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      setActiveLoadingPlanId(planId);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        "https://obzogpozgoolhededqkb.supabase.co/functions/v1/stripe",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ plan: planId }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error);
        setActiveLoadingPlanId(null);
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Payment routing failed:", err.message);
      setActiveLoadingPlanId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono bg-[#FAF4E8] text-[#B77145]">
        Loading options...
      </div>
    );
  }

  // Configurations for each tab view based on the Figma UI
  const plansData = {
    starter: {
      id: "starter",
      title: "Single Roadmap",
      subtitle:
        "A personalized roadmap for your therapy journey. No subscription needed.",
      price: "₹1,499",
      period: "/mo",
      buttonText: "Buy Now",
      image:
        "https://res.cloudinary.com/dspwbbjyt/image/upload/v1785938548/Image_jyjcj0.png",
    },
    quarterly: {
      id: "quarterly",
      title: "Quarterly Care",
      subtitle:
        "Consistent guidance and structured support designed for families.",
      price: "₹3,999",
      period: "/quarter",
      buttonText: "Buy Now",
      image:
        "https://res.cloudinary.com/dspwbbjyt/image/upload/v1785938548/Image_jyjcj0.png",
    },
    yearly: {
      id: "yearly",
      title: "Yearly Transformation",
      subtitle:
        "Long-term mental care with full access to all therapy resources.",
      price: "₹11,999",
      period: "/year",
      buttonText: "Buy Now",
      image:
        "https://res.cloudinary.com/dspwbbjyt/image/upload/v1785938548/Image_jyjcj0.png",
    },
  };

  const currentPlan = plansData[selectedTab];
  const isCurrentlyActive = subscription?.plan === currentPlan.id;
  const isPlanRedirecting = activeLoadingPlanId === currentPlan.id;

  return (
    <main className="min-h-screen py-10 px-4 flex flex-col items-center justify-start text-[#B77145] font-sans selection:bg-[#B77145]/20 manrope">
      {/* Title */}
      <div className="max-w-50 md:max-w-125">
        <h1 className="text-[32px] md:text-[54px] font-normal leading-[1.2] tracking-[-4%] text-center mb-7.5">
          Find Your Perfect Plan
        </h1>
      </div>

      <div className="bg-[#B77145] h-16 p-1.5 rounded-full mb-10 flex items-center justify-between w-full max-w-75">
        <button
          type="button"
          onClick={() => setSelectedTab("starter")}
          className={`flex-1 h-full rounded-full text-sm sm:text-base font-medium text-[14.4px] transition-all duration-300 flex items-center justify-center leading-[115%] tracking-[-6%] py-4 md:py-5.75 ${
            selectedTab === "starter"
              ? "bg-[#FAF4E8] text-[#B77145] shadow-sm"
              : "text-white hover:text-white/80"
          }`}
        >
          Starter
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab("quarterly")}
          className={`flex-1 h-full rounded-full text-sm sm:text-base font-medium text-[14.4px] transition-all duration-300 flex items-center justify-center leading-[115%] tracking-[-0.06em] py-4 md:py-5.75 ${
            selectedTab === "quarterly"
              ? "bg-[#FAF4E8] text-[#B77145] shadow-sm"
              : "text-white hover:text-white/80"
          }`}
        >
          Quarterly
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab("yearly")}
          className={`flex-1 h-full rounded-full text-sm sm:text-base font-medium text-[14.4px] transition-all duration-300 flex items-center justify-center leading-[115%] tracking-[-0.06em] py-4 md:py-5.75 ${
            selectedTab === "yearly"
              ? "bg-[#FAF4E8] text-[#B77145] shadow-sm"
              : "text-white hover:text-white/80"
          }`}
        >
          Yearly
        </button>
      </div>

      {/* Main Card Container */}
      <div className="w-full max-w-82.5 md:max-w-125 bg-[#FAF4E8] rounded-4xl md:rounded-[60px] pt-10 p-6.25 flex flex-col items-center text-center shadow-xs manrope mb-7.5">
        {/* Dynamic Card Header Text */}
        <h2 className="text-[28px] md:text-[38px] font-medium mb-3 text-[#B77145] leading-[120%] tracking-[-4%]">
          {currentPlan.title}
        </h2>
        <p className="text-[13px] md:text-[16px] text-[#B77145]/80 max-w-90 leading-relaxed mb-6.5 font-normal tracking-[-2%]">
          {currentPlan.subtitle}
        </p>

        <div className="text-[15px] md:text-[16px] font-semibold mb-6 text-[#B77145]">
          {currentPlan.price}
          <span className="text-lg md:text-[16px] font-semibold mb-6 text-[#B77145]">
            {currentPlan.period}
          </span>
        </div>

        {/* Featured Image Block with Dynamic Button overlay */}
        <div className="relative w-full aspect-4/3 rounded-[30px] md:rounded-[40px] overflow-hidden group">
          <img
            src={currentPlan.image}
            alt={currentPlan.title}
            className="w-full h-full object-cover transition-transform duration-500"
          />

          {/* Floating Action Button */}
          <div className="absolute inset-0 flex items-end justify-center p-6 bg-linear-to-t from-black/20 via-transparent to-transparent">
            <button
              onClick={() => buyPlan(currentPlan.id)}
              disabled={isCurrentlyActive || activeLoadingPlanId !== null}
              className="bg-[#B77145] hover:bg-[#a26038]  text-white w-35 h-15 rounded-full text-sm md:text-[16px] font-semibold transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isCurrentlyActive ? (
                "Current Plan"
              ) : isPlanRedirecting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Connecting...</span>
                </>
              ) : (
                currentPlan.buttonText
              )}
            </button>
          </div>
        </div>
      </div>
      <div
        ref={popupRef}
        className="relative group inline-block mb-5 z-30"
      >
        {/* Know More Button */}
        <button
          type="button"
          onClick={() => setIsPopupOpen((prev) => !prev)}
          className="cursor-pointer text-sm md:text-[16px] font-bold text-[#B77145] leading-[120%] tracking-[-2%] border-b border-transparent group-hover:border-dashed group-hover:border-[#B77145] transition-all focus:outline-none"
        >
          Know more
        </button>

        {/* Popup Bubble */}
        <div
          className={`transition-all duration-200 z-50 bg-[#FAF4E8] rounded-[30px] shadow-xl text-left text-[#B77145]
    ${isPopupOpen ? "block" : "hidden md:group-hover:block"}
    absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72.5 py-4.5 px-7 text-[12px]
    md:-top-37.5 md:left-[130%] md:translate-x-0 md:w-95 md:p-7 md:text-[16px]`}
        >
          <h4 className="font-semibold text-[14px] md:text-[16px] mb-3 md:mb-3.75 leading-[130%] tracking-[0%]">
            Whats included
          </h4>

          <ul className="flex flex-col gap-1.25 font-normal text-[12px] md:text-[16px]">
            <li className="flex items-center gap-[2.5px]">
              <img src={tick} alt="tick" className="md:w-4 md:h-4 h-2.5 w-2.5 " />
              <span>One personalized Manasi roadmap</span>
            </li>
            <li className="flex items-center gap-[2.5px]">
              <img src={tick} alt="tick" className="md:w-4 md:h-4 h-2.5 w-2.5 " />
              
              <span>7-day full platform access</span>
            </li>
            <li className="flex items-center gap-[2.5px]">
              <img src={tick} alt="tick" className="md:w-4 md:h-4 h-2.5 w-2.5 " />
              
              <span>Therapy Library & Learning Hub</span>
            </li>
            <li className="flex items-center gap-[2.5px]">
              <img src={tick} alt="tick" className="md:w-4 md:h-4 h-2.5 w-2.5 " />
              
              <span>Community access</span>
            </li>
            <li className="flex items-center gap-[2.5px]">
              <img src={tick} alt="tick" className="md:w-4 md:h-4 h-2.5 w-2.5 " />
              
              <span>Save & revisit your roadmap</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-4">
        <span
          className={`h-2 rounded-full transition-all duration-300 ${
            selectedTab === "starter"
              ? "w-5 bg-[#B77145]"
              : "w-2 bg-[#B77145]/30"
          }`}
        />
        <span
          className={`h-2 rounded-full transition-all duration-300 ${
            selectedTab === "quarterly"
              ? "w-5 bg-[#B77145]"
              : "w-2 bg-[#B77145]/30"
          }`}
        />
        <span
          className={`h-2 rounded-full transition-all duration-300 ${
            selectedTab === "yearly"
              ? "w-5 bg-[#B77145]"
              : "w-2 bg-[#B77145]/30"
          }`}
        />
      </div>
    </main>
  );
}
