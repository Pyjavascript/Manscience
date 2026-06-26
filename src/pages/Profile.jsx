// import { useEffect, useState } from "react";
// import { supabase } from "../supabase";
// import { useNavigate } from "react-router-dom";

// export default function Profile() {
//   const navigate = useNavigate();
//   const [subscription, setSubscription] = useState(null);
//   const [user, setUser] = useState(null);
  
//   // New state variables for post submission
//   const [reviewContent, setReviewContent] = useState("");
//   const [submittingPost, setSubmittingPost] = useState(false);

//   useEffect(() => {
//     loadProfile();
//   }, []);

//   async function loadProfile() {
//     const {
//       data: { user },
//     } = await supabase.auth.getUser();

//     if (!user) {
//       navigate("/auth");
//       return;
//     }

//     setUser(user);

//     const { data } = await supabase
//       .from("subscriptions")
//       .select("*")
//       .eq("user_id", user.id)
//       .maybeSingle();

//     setSubscription(data);
//   }

//   // New handler function to post directly to your community_hub table
//   async function handlePostReview(e) {
//     e.preventDefault();
//     if (!reviewContent.trim()) return;

//     try {
//       setSubmittingPost(true);

//       // Determine display username from auth metadata or split email prefix
//       const displayName =
//         user.user_metadata?.name ||
//         user.user_metadata?.full_name ||
//         user.email.split("@")[0];

//       const { error } = await supabase.from("community_hub").insert([
//         {
//           user_id: user.id,
//           username: displayName,
//           content: reviewContent.trim(),
//           header: null, // initially null as requested
//           tag: null,    // initially null as requested
//           status: "pending", // maps into admin dashboard approval stream
//         },
//       ]);

//       if (error) throw error;

//       alert("Review posted successfully! Awaiting admin moderation.");
//       setReviewContent("");
//     } catch (err) {
//       console.error("Submission failed:", err.message);
//       alert(`Error submitting post: ${err.message}`);
//     } finally {
//       setSubmittingPost(false);
//     }
//   }

//   async function logout() {
//     await supabase.auth.signOut();
//     navigate("/auth");
//   }

//   async function deleteAccount() {
//     const confirmed = confirm("Delete account permanently?");

//     if (!confirmed) return;

//     const {
//       data: { session },
//     } = await supabase.auth.getSession();

//     const response = await fetch(
//       "https://obzogpozgoolhededqkb.supabase.co/functions/v1/delete-account",
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${session.access_token}`,
//         },
//       },
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       alert(data.error);
//       return;
//     }

//     await supabase.auth.signOut();

//     alert("Account deleted");
//     setUser(null);
//     navigate("/auth");
//   }

//   async function cancelSubscription() {
//     const confirmed = confirm("Cancel subscription?");

//     if (!confirmed) return;

//     const {
//       data: { session },
//     } = await supabase.auth.getSession();

//     await fetch(
//       "https://obzogpozgoolhededqkb.supabase.co/functions/v1/cancel-subscription",
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${session.access_token}`,
//         },
//       }
//     );

//     await fetch(
//       "https://obzogpozgoolhededqkb.supabase.co/functions/v1/delete-subscription",
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${session.access_token}`,
//         },
//       }
//     );

//     setSubscription(null);

//     alert("Subscription cancelled");
//   }

//   if (!user) {
//     return <div className="bg-white rounded-xl shadow p-6">Not Logged In</div>;
//   }

//   return (
//     <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center font-mono p-4 gap-6">
//       {/* Profile Details Card */}
//       <div className="bg-white rounded-xl shadow p-6 w-full max-w-xl">
//         <h2 className="text-2xl font-bold mb-5">User Profile</h2>

//         <div className="space-y-3">
//           <p>
//             <strong>ID:</strong> {user.id}
//           </p>

//           <p>
//             <strong>Name:</strong> {user.user_metadata?.name || "—"}
//           </p>

//           <p>
//             <strong>Email:</strong> {user.email}
//           </p>
//           <p>
//             <strong>Subscription:</strong> {subscription?.plan || "None"}
//           </p>
//           {subscription && (
//             <p>
//               <strong>Next Billing Date:</strong>{" "}
//               {subscription.current_period_end
//                 ? new Date(subscription.current_period_end).toLocaleDateString()
//                 : "—"}
//             </p>
//           )}

//           {subscription && (
//             <button
//               className="bg-red-600 text-white px-5 py-2 rounded-lg mt-2"
//               onClick={() => cancelSubscription()}
//             >
//               Cancel Subscription
//             </button>
//           )}

//           {!subscription && (
//             <button
//               onClick={() => navigate("/subscription")}
//               className="bg-black text-white px-5 py-2 rounded-lg mt-2"
//             >
//               Choose Plan
//             </button>
//           )}
//         </div>

//         <div className="flex gap-3 mt-6 border-t pt-4">
//           <button onClick={logout} className="px-5 py-2 border rounded-lg hover:bg-gray-50">
//             Logout
//           </button>

//           <button
//             onClick={deleteAccount}
//             className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
//           >
//             Delete Account
//           </button>
//         </div>
//       </div>

//       {/* Community Hub Submission Box */}
//       <div className="bg-white rounded-xl shadow p-6 w-full max-w-xl">
//         <h3 className="text-xl font-bold mb-3">Share to Community Hub</h3>
//         <p className="text-sm text-gray-500 mb-4 font-sans">
//           Post feedback, suggestions, or a general review. Your message will be visible in the hub upon admin approval.
//         </p>
        
//         <form onSubmit={handlePostReview} className="space-y-4">
//           <div>
//             <textarea
//               rows="4"
//               required
//               disabled={submittingPost}
//               placeholder="Type your review or community post content here..."
//               value={reviewContent}
//               onChange={(e) => setReviewContent(e.target.value)}
//               className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:border-black font-sans resize-none text-sm"
//             />
//           </div>
//           <div className="flex justify-end">
//             <button
//               type="submit"
//               disabled={submittingPost || !reviewContent.trim()}
//               className="bg-black text-white px-6 py-2 rounded-lg text-sm disabled:opacity-50 transition"
//             >
//               {submittingPost ? "Submitting..." : "Submit Post"}
//             </button>
//           </div>
//         </form>
//       </div>
//     </main>
//   );
// }


import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [user, setUser] = useState(null);
  
  // State variables for post submission
  const [reviewContent, setReviewContent] = useState("");
  const [anonName, setAnonName] = useState("");
  const [submittingPost, setSubmittingPost] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Do not redirect to /auth; let unauthenticated guests see the page to post reviews
    if (!user) {
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

  async function handlePostReview(e) {
    e.preventDefault();
    if (!reviewContent.trim()) return;

    // Guard rail: if anonymous guest, check that they provided a name
    if (!user && !anonName.trim()) {
      alert("Please provide your name before submitting.");
      return;
    }

    try {
      setSubmittingPost(true);

      let displayName = "";
      let userIdField = null;

      if (user) {
        userIdField = user.id;
        displayName =
          user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          user.email.split("@")[0];
      } else {
        displayName = anonName.trim();
      }

      const { error } = await supabase.from("community_hub").insert([
        {
          user_id: userIdField,
          username: displayName,
          content: reviewContent.trim(),
          header: null,    // initially null, admin populates later
          tag_id: null,    // initially null, admin maps later
          status: "pending", // routes to admin dashboard stream
        },
      ]);

      if (error) throw error;

      alert("Review posted successfully! Awaiting admin moderation.");
      setReviewContent("");
      setAnonName("");
    } catch (err) {
      console.error("Submission failed:", err.message);
      alert(`Error submitting post: ${err.message}`);
    } finally {
      setSubmittingPost(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setSubscription(null);
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

  async function cancelSubscription() {
    const confirmed = confirm("Cancel subscription?");
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
    <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center font-mono p-4 gap-6">
      {/* Profile Details Card */}
      <div className="bg-white rounded-xl shadow p-6 w-full max-w-xl">
        <h2 className="text-2xl font-bold mb-5">User Profile</h2>

        {user ? (
          <div className="space-y-3">
            <p>
              <strong>ID:</strong> {user.id}
            </p>
            <p>
              <strong>Name:</strong> {user.user_metadata?.name || "—"}
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

            <div className="pt-2 flex gap-3">
              {subscription && (
                <button
                  className="bg-red-600 text-white px-5 py-2 rounded-lg"
                  onClick={cancelSubscription}
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
            
            <div className="flex gap-3 mt-6 border-t pt-4">
              <button onClick={logout} className="px-5 py-2 border rounded-lg hover:bg-gray-50">
                Logout
              </button>
              <button
                onClick={deleteAccount}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Account
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-500 text-sm">
              You are currently viewing this page as a guest anonymous reader. Log in to sync account profile parameters.
            </p>
            <button
              onClick={() => navigate("/auth")}
              className="bg-black text-white px-5 py-2 rounded-lg text-sm"
            >
              Sign In / Authenticate
            </button>
          </div>
        )}
      </div>

      {/* Community Hub Submission Box */}
      <div className="bg-white rounded-xl shadow p-6 w-full max-w-xl">
        <h3 className="text-xl font-bold mb-3">Share to Community Hub</h3>
        <p className="text-sm text-gray-500 mb-4 font-sans">
          Post feedback, suggestions, or a general review. Your message will be visible in the hub upon admin approval.
        </p>
        
        <form onSubmit={handlePostReview} className="space-y-4">
          {/* Guest Name input field renders only if user is unauthenticated */}
          {!user && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Your Name *
              </label>
              <input
                type="text"
                required
                disabled={submittingPost}
                placeholder="e.g., John Doe"
                value={anonName}
                onChange={(e) => setAnonName(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:border-black font-sans text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Review Content *
            </label>
            <textarea
              rows="4"
              required
              disabled={submittingPost}
              placeholder="Type your review or community post content here..."
              value={reviewContent}
              onChange={(e) => setReviewContent(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:border-black font-sans resize-none text-sm"
            />
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submittingPost || !reviewContent.trim() || (!user && !anonName.trim())}
              className="bg-black text-white px-6 py-2 rounded-lg text-sm disabled:opacity-50 transition"
            >
              {submittingPost ? "Submitting..." : "Submit Post"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}