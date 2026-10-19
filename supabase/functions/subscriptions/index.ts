import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  // try {
  //   const { action } = await req.json();

  //   if (action !== "users") {
  //     return new Response(
  //       JSON.stringify({ error: "Invalid action" }),
  //       {
  //         status: 400,
  //         headers: {
  //           ...corsHeaders,
  //           "Content-Type": "application/json",
  //         },
  //       }
  //     );
  //   }

  //   // ==========================================
  //   // PASTE THE NEW CODE RIGHT HERE INSTEAD OF THE OLD QUERY:
  //   // ==========================================

  //   // 1. Fetch all subscriptions
  //   // const { data: subs, error: subsError } = await admin
  //   //   .from("subscriptions")
  //   //   .select("user_id, plan, status, created_at")
  //   //   .order("created_at", { ascending: false });

  //   // if (subsError) throw subsError;

  //   // // 2. Fetch all public users
  //   // const { data: profiles, error: profilesError } = await admin
  //   //   .from("users")
  //   //   .select("id, name, email");

  //   // if (profilesError) throw profilesError;

  //   // // 3. Manually map them together in memory
  //   // const profileMap = new Map(profiles.map(p => [p.id, p]));

  //   // const formattedSubscriptions = subs.map((sub) => {
  //   //   const userProfile = profileMap.get(sub.user_id);
  //   //   return {
  //   //     userid: sub.user_id,
  //   //     username: userProfile?.name || "N/A",
  //   //     email: userProfile?.email || "N/A",
  //   //     plan: sub.plan,
  //   //     status: sub.status,
  //   //   };
  //   // });

  //   // 1. Fetch all subscriptions with current_period_end included!
  //   const { data: subs, error: subsError } = await admin
  //     .from("subscriptions")
  //     .select("user_id, plan, status, current_period_end, created_at") // <-- Added current_period_end here
  //     .order("created_at", { ascending: false });

  //   if (subsError) throw subsError;

  //   // 2. Map them together in memory
  //   const profileMap = new Map(profiles.map(p => [p.id, p]));

  //   const formattedSubscriptions = subs.map((sub) => {
  //     const userProfile = profileMap.get(sub.user_id);
  //     return {
  //       userid: sub.user_id,
  //       username: userProfile?.name || "N/A",
  //       email: userProfile?.email || "N/A",
  //       plan: sub.plan,
  //       status: sub.status,
  //       current_period_end: sub.current_period_end, // <-- Pass it through here
  //     };
  //   });

  //   // ==========================================
  //   // END OF NEW CODE
  //   // ==========================================

  //   return new Response(
  //     JSON.stringify({
  //       success: true,
  //       totalUsers: formattedSubscriptions.length,
  //       users: formattedSubscriptions, // Send out the newly stitched array
  //     }),
  //     {
  //       headers: {
  //         ...corsHeaders,
  //         "Content-Type": "application/json",
  //       },
  //     }
  //   );
  // } catch (err) {
  try {
    const { action } = await req.json();

    if (action !== "users") {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // 1. Fetch all subscription records along with period ends
    const { data: subs, error: subsError } = await admin
      .from("subscriptions")
      .select("user_id, plan, status, current_period_end, created_at")
      .order("created_at", { ascending: false });

    if (subsError) throw subsError;

    // 2. Fetch all public user profiles so we can map names and emails
    const { data: profiles, error: profilesError } = await admin
      .from("users")
      .select("id, name, email");

    if (profilesError) throw profilesError;

    // 3. Map them together safely in memory
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const formattedSubscriptions = (subs || []).map((sub) => {
      const userProfile = profileMap.get(sub.user_id);
      return {
        userid: sub.user_id,
        username: userProfile?.name || "N/A",
        email: userProfile?.email || "N/A",
        plan: sub.plan,
        status: sub.status,
        current_period_end: sub.current_period_end || null,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        totalUsers: formattedSubscriptions.length,
        users: formattedSubscriptions, 
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});