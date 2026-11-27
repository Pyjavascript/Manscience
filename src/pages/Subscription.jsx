import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import PlanPicker from "../components/PlanPicker";

export default function Subscription() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono bg-[#FAF4E8] text-[#B77145]">
        Loading options...
      </div>
    );
  }

  return (
    <main className="min-h-screen py-10 px-4 flex flex-col items-center justify-start text-[#B77145] font-sans selection:bg-[#B77145]/20 manrope">
      {/* Title */}
      <div className="flex justify-center items-center">
        <h1 className="text-[32px] md:text-[54px] font-normal leading-[1.2] tracking-[-4%] text-center mb-7.5 max-w-[60%]">
          Find Your Perfect Plan
        </h1>
      </div>

      <PlanPicker activePlanId={subscription?.plan} />
    </main>
  );
}
