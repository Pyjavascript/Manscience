// import { useEffect, useState } from "react";
// import { supabase } from "../supabase";
// import { useNavigate } from "react-router-dom";
// import thunder from "../assets/subscribe/thunder.svg";
// import layer from "../assets/subscribe/layer.svg";
// import tick from "../assets/subscribe/tick.svg";

// export default function Subscription() {
//   const navigate = useNavigate();
//   const [subscription, setSubscription] = useState(null);
//   const [billingCycle, setBillingCycle] = useState("monthly"); // 'monthly' or 'annual'
//   const [loading, setLoading] = useState(true);

//   const [activeLoadingPlanId, setActiveLoadingPlanId] = useState(null);

//   useEffect(() => {
//     loadSubscription();
//   }, []);

//   async function loadSubscription() {
//     const {
//       data: { user },
//     } = await supabase.auth.getUser();

//     if (!user) {
//       setLoading(false);
//       return;
//     }

//     const { data } = await supabase
//       .from("subscriptions")
//       .select("*")
//       .eq("user_id", user.id)
//       .maybeSingle();

//     setSubscription(data);
//     setLoading(false);
//   }

//   async function buyPlan(planId) {
//     const {
//       data: { user },
//     } = await supabase.auth.getUser();

//     if (!user) {
//       navigate("/auth");
//       return;
//     }

//     try {
//       setActiveLoadingPlanId(planId);
//       const {
//         data: { session },
//       } = await supabase.auth.getSession();

//       const targetPlan =
//         billingCycle === "annual" ? `${planId}_annual` : planId;

//       const response = await fetch(
//         "https://obzogpozgoolhededqkb.supabase.co/functions/v1/stripe",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${session.access_token}`,
//           },
//           body: JSON.stringify({ plan: targetPlan }),
//         },
//       );

//       const data = await response.json();

//       if (!response.ok) {
//         alert(data.error);
//         return;
//       }

//       window.location.href = data.url;
//     } catch (err) {
//       console.error("Payment routing failed:", err.message);
//       setActiveLoadingPlanId(null);
//     }
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center font-mono bg-[#faf8f6]">
//         Loading options...
//       </div>
//     );
//   }

//   const plansConfig = [
//     {
//       id: "go",
//       name: "Premium care",
//       priceMonthly: 499,
//       priceAnnual: 400,
//       icon: thunder,
//       features: [
//         "Learning Hub",
//         "Research Digest",
//         "Mental Assistant Access",
//         "Research Digest",
//         "Mental Assistant Access",
//       ],
//       isFeatured: false,
//     },
//     {
//       id: "growth",
//       name: "Premium care",
//       priceMonthly: 499,
//       priceAnnual: 400,
//       icon: layer,
//       features: [
//         "Learning Hub",
//         "Research Digest",
//         "Mental Assistant Access",
//         "Research Digest",
//         "Mental Assistant Access",
//       ],
//       isFeatured: true,
//     },
//     {
//       id: "pro",
//       name: "Premium care",
//       priceMonthly: 499,
//       priceAnnual: 400,
//       icon: thunder,
//       features: [
//         "Learning Hub",
//         "Research Digest",
//         "Mental Assistant Access",
//         "Research Digest",
//         "Mental Assistant Access",
//       ],
//       isFeatured: false,
//     },
//   ];

//   return (
//     <main className="min-h-screen bg-[#faf8f6] py-12 px-4 flex flex-col items-center justify-center font-sans manrop ">
//       {/* Custom Switch pill element */}
//       <div className="flex bg-[#B05A36] px-1.5 rounded-full mb-12 w-64.5 md:w-[320px] h-17.5 text-[16px] items-center">
//         <button
//           onClick={() => setBillingCycle("monthly")}
//           className={`h-14 rounded-full font-medium transition duration-200 w-1/2 flex items-center justify-center ${
//             billingCycle === "monthly"
//               ? "bg-white text-[#B05A36]"
//               : "text-white"
//           }`}
//         >
//           Monthly
//         </button>
//         <button
//           onClick={() => setBillingCycle("annual")}
//           className={`h-14 rounded-full font-medium transition duration-200 w-1/2 flex items-center justify-center ${
//             billingCycle === "annual" ? "bg-white text-[#B05A36]" : "text-white"
//           }`}
//         >
//           Annual
//         </button>
//       </div>

//       {/* Grid wrapper architecture */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full px-2">
//         {plansConfig.map((plan) => {
//           const displayedPrice =
//             billingCycle === "annual" ? plan.priceAnnual : plan.priceMonthly;
//           const isCurrentlyActive = subscription?.plan === plan.id;
//           const isPlanRedirecting = activeLoadingPlanId === plan.id;

//           return (
//             <div
//               key={plan.id}
//               className={`rounded-4xl p-8 flex flex-col gap-8 justify-between border transition-all manrope ${
//                 plan.isFeatured
//                   ? "card text-white"
//                   : "bg-white border-[#B7714566] text-black"
//               }`}
//               style={{ boxShadow: "none" }}
//             >
//               <div className="text-center md:text-left flex flex-col items-center">
//                 {/* Custom Vector Badge Header Component */}
//                 <div
//                   className={`w-12.5 h-12.5 rounded-full flex items-center justify-center mb-4`}
//                 >
//                   <img src={plan.icon} alt="" className={`w-full h-full`} />
//                 </div>

//                 <p
//                   className={`text-sm  uppercase tracking-wider font-semibold mb-2 leading-7.5 ${plan.isFeatured ? "text-white" : "text-black"}`}
//                 >
//                   {plan.name}
//                 </p>

//                 <div className="flex items-baseline justify-center gap-1 my-1">
//                   <span className="text-[46px] font-semibold">
//                     ₹{displayedPrice}
//                   </span>
//                   <span
//                     className={`text-[18px] ${plan.isFeatured ? "text-white" : "text-black"}`}
//                   >
//                     /month
//                   </span>
//                 </div>

//                 <p
//                   className={`text-[14px] mt-1 mb-8 ${plan.isFeatured ? "text-white" : "text-black"}`}
//                 >
//                   {billingCycle === "annual"
//                     ? "Billed annually"
//                     : "Billed monthly"}
//                 </p>

//                 {/* Bullet details context stack */}
//                 <ul className="w-full space-y-3.5 text-[16px] text-left px-2 mb-10">
//                   {plan.features.map((feature, idx) => (
//                     <li key={idx} className="flex items-center gap-3.75">
//                       <img
//                         src={tick}
//                         alt="check"
//                         className={`w-6 h-6 shrink-0 ${plan.isFeatured ? "invert-[1] brightness-[2]" : ""}`}
//                       />
//                       <span
//                         className={
//                           plan.isFeatured ? "text-white" : "text-black"
//                         }
//                       >
//                         {feature}
//                       </span>
//                     </li>
//                   ))}
//                 </ul>
//               </div>

//               {/* Transaction Action Base */}
//               <div className="w-full mt-auto">
//                 <button
//                   onClick={() => buyPlan(plan.id)}
//                   disabled={isCurrentlyActive || activeLoadingPlanId !== null}
//                   className={`w-full py-3 px-6 rounded-full font-medium text-[18px] tracking-wide transition-all flex items-center justify-center gap-2 border border-[#B7714566] ${
//                     plan.isFeatured
//                       ? "bg-white border-none text-black hover:bg-gray-100 disabled:bg-white/70"
//                       : "bg-white text-black hover:bg-[#faf6f2] disabled:bg-gray-100 disabled:text-gray-400"
//                   }`}
//                 >
//                   {isCurrentlyActive ? (
//                     "Current Plan"
//                   ) : isPlanRedirecting ? (
//                     <>
//                       {/* Optional inline subtle spinner markup */}
//                       <svg
//                         className="animate-spin h-5 w-5 text-current"
//                         fill="none"
//                         viewBox="0 0 24 24"
//                       >
//                         <circle
//                           className="opacity-25"
//                           cx="12"
//                           cy="12"
//                           r="10"
//                           stroke="currentColor"
//                           strokeWidth="4"
//                         />
//                         <path
//                           className="opacity-75"
//                           fill="currentColor"
//                           d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//                         />
//                       </svg>
//                       <span>Connecting...</span>
//                     </>
//                   ) : (
//                     "Get started"
//                   )}
//                 </button>
//               </div>
//             </div>
//           );
//         })}
//       </div>
//     </main>
//   );
// }

import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

export default function Subscription() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [selectedTab, setSelectedTab] = useState("starter");
  const [loading, setLoading] = useState(true);
  const [activeLoadingPlanId, setActiveLoadingPlanId] = useState(null);

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
      <div className="max-w-[200px] md:max-w-[500px]">
        <h1 className="text-[32px] md:text-[54px] font-normal leading-[1.2] tracking-[-4%] text-center mb-[30px]">
        Find Your Perfect Plan
      </h1>
      </div>

      <div className="bg-[#B77145] h-[64px] p-1.5 rounded-full mb-[40px] flex items-center justify-between w-full max-w-[300px]">
        <button
          type="button"
          onClick={() => setSelectedTab("starter")}
          className={`flex-1 h-full rounded-full text-sm sm:text-base font-medium text-[14.4px] transition-all duration-300 flex items-center justify-center leading-[115%] tracking-[-6%] py-[16px] md:py-5.75 ${
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
          className={`flex-1 h-full rounded-full text-sm sm:text-base font-medium text-[14.4px] transition-all duration-300 flex items-center justify-center leading-[115%] tracking-[-0.06em] py-[16px] md:py-5.75 ${
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
          className={`flex-1 h-full rounded-full text-sm sm:text-base font-medium text-[14.4px] transition-all duration-300 flex items-center justify-center leading-[115%] tracking-[-0.06em] py-[16px] md:py-5.75 ${
            selectedTab === "yearly"
              ? "bg-[#FAF4E8] text-[#B77145] shadow-sm"
              : "text-white hover:text-white/80"
          }`}
        >
          Yearly
        </button>
      </div>

      {/* Main Card Container */}
      <div className="w-full max-w-[330px] md:max-w-[500px] bg-[#FAF4E8] rounded-[32px] rounded-[30px] md:rounded-[60px] px-[20px] pt-[40px] flex flex-col items-center text-center shadow-xs manrope mb-[30px]">
        {/* Dynamic Card Header Text */}
        <h2 className="text-[28px] md:text-[38px] font-medium mb-3 text-[#B77145] leading-[120%] tracking-[-4%]">
          {currentPlan.title}
        </h2>
        <p className="text-[13px] md:text-[16px] text-[#B77145]/80 max-w-[360px] leading-relaxed mb-[26px] font-normal tracking-[-2%]">
          {currentPlan.subtitle}
        </p>

        <div className="text-[15px] md:text-[16px] font-semibold mb-6 text-[#B77145]">
          {currentPlan.price}
          <span className="text-lg md:text-[16px] font-semibold mb-6 text-[#B77145]">
            {currentPlan.period}
          </span>
        </div>

        {/* Featured Image Block with Dynamic Button overlay */}
        <div className="relative w-full aspect-[4/3] rounded-[30px] md:rounded-[40px] overflow-hidden group">
          <img
            src={currentPlan.image}
            alt={currentPlan.title}
            className="w-full h-full object-cover transition-transform duration-500"
          />

          {/* Floating Action Button */}
          <div className="absolute inset-0 flex items-end justify-center p-6 bg-gradient-to-t from-black/20 via-transparent to-transparent">
            <button
              onClick={() => buyPlan(currentPlan.id)}
              disabled={isCurrentlyActive || activeLoadingPlanId !== null}
              className="bg-[#B77145] hover:bg-[#a26038]  text-white font-normal w-[140px] h-[60px] rounded-full text-sm md:text-[16px] font-semibold transition-all duration-200 flex items-center justify-center gap-2"
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

      {/* Footer link & Indicator Dots */}
      <button className="mb-[20px] cursor-pointer text-sm md:text-[16px] font-bold text-[#B77145]  leading-[120%] tracking-[-2%]">
        Know more
      </button>

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
