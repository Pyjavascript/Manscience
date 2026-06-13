import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function Subscription() {
  const [subscription, setSubscription] =
    useState(null);

  useEffect(() => {
    loadSubscription();
  }, []);

  async function loadSubscription() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    setSubscription(data);
  }

  async function buyPlan(plan) {
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
        body: JSON.stringify({ plan }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.error);
      return;
    }

    window.location.href = data.url;
  }

  // async function cancelSubscription() {
  //   const confirmed = confirm(
  //     "Cancel subscription?"
  //   );

  //   if (!confirmed) return;

  //   const {
  //     data: { session },
  //   } = await supabase.auth.getSession();

  //   await fetch(
  //     "https://obzogpozgoolhededqkb.supabase.co/functions/v1/cancel-subscription",
  //     {
  //       method: "POST",
  //       headers: {
  //         Authorization: `Bearer ${session.access_token}`,
  //       },
  //     }
  //   );

  //   await fetch(
  //     "https://obzogpozgoolhededqkb.supabase.co/functions/v1/delete-subscription",
  //     {
  //       method: "POST",
  //       headers: {
  //         Authorization: `Bearer ${session.access_token}`,
  //       },
  //     }
  //   );

  //   setSubscription(null);

  //   alert("Subscription cancelled");
  // }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center font-mono">
      <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-2xl font-bold mb-5">
        Subscription
      </h2>

      <div className="space-y-2 mb-6">
        <p>
          Status:{" "}
          {subscription?.status ||
            "Unsubscribed"}
        </p>

        <p>
          Plan: {subscription?.plan || "None"}
        </p>

        <p>
          Subscription ID:{" "}
          {subscription?.stripe_subscription_id ||
            "—"}
        </p>

        <p>
          Next Billing:{" "}
          {subscription?.current_period_end
            ? new Date(
                subscription.current_period_end
              ).toLocaleDateString()
            : "—"}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <button
          onClick={() => buyPlan("go")}
          className="border rounded-lg p-4"
        >
          Go ($5)
        </button>

        <button
          onClick={() => buyPlan("growth")}
          className="border rounded-lg p-4"
        >
          Growth ($10)
        </button>

        <button
          onClick={() => buyPlan("pro")}
          className="border rounded-lg p-4"
        >
          Pro ($15)
        </button>
      </div>

  
    </div>
    </main>
  );
}