import { useEffect, useState } from "react";
import { supabase } from "../supabase";

import { useNavigate } from "react-router-dom";

export default function Profile() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/auth");
      return;
    }

    setUser(user);

    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    setSubscription(data);
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate("/auth");
  }

  async function deleteAccount() {
    const confirmed = confirm("Delete account permanently?");

    if (!confirmed) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch(
      "https://obzogpozgoolhededqkb.supabase.co/functions/v1/delete-account",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.error);
      return;
    }

    await supabase.auth.signOut();

    alert("Account deleted");
    setUser(null);
    navigate("/auth");
  }

  if (!user) {
    return <div className="bg-white rounded-xl shadow p-6">Not Logged In</div>;
  }

    async function cancelSubscription() {
    const confirmed = confirm(
      "Cancel subscription?"
    );

    if (!confirmed) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    await fetch(
      "https://obzogpozgoolhededqkb.supabase.co/functions/v1/cancel-subscription",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    await fetch(
      "https://obzogpozgoolhededqkb.supabase.co/functions/v1/delete-subscription",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    setSubscription(null);

    alert("Subscription cancelled");
  }


  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center font-mono">
      <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-2xl font-bold mb-5">User Profile</h2>

      <div className="space-y-3">
        <p>
          <strong>ID:</strong> {user.id}
        </p>

        <p>
          <strong>Name:</strong> {user.user_metadata?.name}
        </p>

        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>Subscription:</strong> {subscription?.plan || "None"}
        </p>
        {subscription && (
          <p>
            <strong>Next Billing Date:</strong>{" "}
            {subscription.current_period_end
              ? new Date(subscription.current_period_end).toLocaleDateString()
              : "—"}
          </p>
        )}

       {subscription && (
         <button
          className="bg-red-600 text-white px-5 py-2 rounded-lg "
          onClick={() => cancelSubscription()}
        >
          Cancel Subscription
        </button>
       )}

        {!subscription && (
          <button
            onClick={() => navigate("/subscription")}
            className="bg-black text-white px-5 py-2 rounded-lg"
          >
            Choose Plan
          </button>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={logout} className="px-5 py-2 border rounded-lg">
          Logout
        </button>

        <button
          onClick={deleteAccount}
          className="px-5 py-2 bg-red-600 text-white rounded-lg"
        >
          Delete Account
        </button>
      </div>
    </div>
    </main>
  );
}
