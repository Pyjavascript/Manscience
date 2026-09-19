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
      // navigate("/auth");
      window.location.href = `${window.location.origin}/auth`;
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
      buttonText: "Get Involved",
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
      buttonText: "Get Involved",
      image:
        "https://res.cloudinary.com/dspwbbjyt/image/upload/v1789202513/Group_1261154510_ifnyz6.png",
    },
    yearly: {
      id: "yearly",
      title: "Yearly Care",
      subtitle:
        "Long-term mental care with full access to all therapy resources.",
      price: "₹11,999",
      period: "/year",
      buttonText: "Get Involved",
      image:
        "https://res.cloudinary.com/dspwbbjyt/image/upload/v1789202513/Group_1261154509_r7pqmu.png",
    },
  };

  const currentPlan = plansData[selectedTab];
  const isCurrentlyActive = subscription?.plan === currentPlan.id;
  const isPlanRedirecting = activeLoadingPlanId === currentPlan.id;

  return (
    <main className="min-h-screen py-10 px-4 flex flex-col items-center justify-start text-[#B77145] font-sans selection:bg-[#B77145]/20 manrope">
      {/* Title */}
      <div className="flex justify-center items-center">
        <h1 className="text-[32px] md:text-[54px] font-normal leading-[1.2] tracking-[-4%] text-center mb-7.5 max-w-[60%]">
          Find Your Perfect Plan
        </h1>
      </div>

      <div className="bg-[#B77145] h-[51px] md:h-[67px] p-[5px] rounded-full mb-10 flex items-center justify-between w-auto gap-[2px] md:gap-[5px]">
        <button
          type="button"
          onClick={() => setSelectedTab("starter")}
          className={`flex-1 h-full rounded-full text-sm sm:text-base font-medium text-[14px] transition-all duration-300 flex items-center justify-center leading-[115%] tracking-[-3%] py-[15px] px-[19px] md:py-5.75 md:px-[19px]  w-[80px]  md:w-[80px] ${
            selectedTab === "starter"
              ? "bg-white text-[#B77145] shadow-sm"
              : "text-white hover:text-white/80"
          }`}
        >
          Starter
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab("quarterly")}
          className={`flex-1 h-full rounded-full text-sm sm:text-base font-medium text-[14px] transition-all duration-300 flex items-center justify-center leading-[115%] tracking-[-3%] py-[15px] px-[19px] md:py-5.75 md:px-[19px]  w-[80px]  md:w-[80px] ${
            selectedTab === "quarterly"
              ? "bg-white text-[#B77145] shadow-sm"
              : "text-white hover:text-white/80"
          }`}
        >
          Quarterly
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab("yearly")}
          className={`flex-1 h-full rounded-full text-sm sm:text-base font-medium text-[14px] transition-all duration-300 flex items-center justify-center leading-[115%] tracking-[-3%] py-[15px] px-[19px] md:py-5.75 md:px-[19x] w-[80px] md:w-[80px] ${
            selectedTab === "yearly"
              ? "bg-white text-[#B77145] shadow-sm"
              : "text-white hover:text-white/80"
          }`}
        >
          Yearly
        </button>
      </div>

      {/* Main Card Container */}
      <div className="md:h-[480px] lg:h-[540px] h-auto w-full max-w-82.5  md:max-w-[420px] lg:max-w-[440px] lg:max-w-125 bg-[#FAF4E8] rounded-[45px] md:rounded-[60px] px-[15px] py-[15px] pt-[25px] md:pb-[25px] md:pt-[40px] md:px-[25px] flex flex-col items-center text-center shadow-xs manrope mb-7.5">
        {/* Dynamic Card Header Text */}
        <h2 className="text-[28px] md:text-[32px] lg:text-[38px] font-medium mb-3 text-[#B77145] leading-[120%] tracking-[-4%]">
          {currentPlan.title}
        </h2>
        <p className="text-[13px] md:text-[16px] text-[#B77145]/80 max-w-60  md:max-w-80 lg:max-w-80 leading-relaxed mb-6.5 font-normal tracking-[-2%]">
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
              className="bg-[#b77145]  text-white w-[160px] md:w-[160px] h-[60px] md:h-[70px] rounded-full text-sm  font-semibold transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.02]"
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
      <div ref={popupRef} className="relative group inline-block mb-5 z-30">
        {/* Know More Button */}
        <button
          type="button"
          onClick={() => setIsPopupOpen((prev) => !prev)}
          className="cursor-pointer text-sm md:text-[16px] font-bold text-[#68270B] leading-[120%] tracking-[-2%] border-b border-transparent group-hover:border-solid group-hover:border-[#68270B] transition-all focus:outline-none"
        >
          Know more
        </button>

        {/* Popup Bubble */}
        <div className={`custom-popup ${isPopupOpen ? "is-open" : ""}`}>
          <h4 className="font-semibold text-[14px] md:text-[16px] mb-3 md:mb-2 lg:mb-3.75 leading-[130%] tracking-[0%]">
            Whats included
          </h4>

          <ul className="flex flex-col gap-1.25 font-normal text-[12px] lg:text-[16px]">
            <li className="flex items-center gap-[2.5px]">
              <img
                src={tick}
                alt="tick"
                className="md:w-4 md:h-4 h-2.5 w-2.5"
              />
              <span>One personalized Manasi roadmap</span>
            </li>
            <li className="flex items-center gap-[2.5px]">
              <img
                src={tick}
                alt="tick"
                className="md:w-4 md:h-4 h-2.5 w-2.5 "
              />
              <span>7-day full platform access</span>
            </li>
            <li className="flex items-center gap-[2.5px]">
              <img
                src={tick}
                alt="tick"
                className="md:w-4 md:h-4 h-2.5 w-2.5 "
              />
              <span>Therapy Library & Learning Hub</span>
            </li>
            <li className="flex items-center gap-[2.5px]">
              <img
                src={tick}
                alt="tick"
                className="md:w-4 md:h-4 h-2.5 w-2.5 "
              />
              <span>Community access</span>
            </li>
            <li className="flex items-center gap-[2.5px]">
              <img
                src={tick}
                alt="tick"
                className="md:w-4 md:h-4 h-2.5 w-2.5 "
              />
              <span>Save & revisit your roadmap</span>
            </li>
          </ul>
        </div>
      </div>

      {/* <div className="flex items-center gap-1.5 mt-4">
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
      </div> */}
    </main>
  );
}
