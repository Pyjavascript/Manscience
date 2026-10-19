import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(
  Deno.env.get("STRIPE_SECRET_KEY")!,
  {
    apiVersion: "2024-06-20",
  }
);


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const authHeader =
      req.headers.get("Authorization");

    const token =
      authHeader?.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    console.log("USER", user?.id);

    if (authError || !user) {
      return Response.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    const { data: subscription, error } =
      await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .single();

    console.log("SUB", subscription);

    if (error || !subscription) {
      return Response.json(
        {
          error: "Subscription not found",
        },
        {
          status: 404,
          headers: corsHeaders,
        }
      );
    }

    await stripe.subscriptions.cancel(
      subscription.stripe_subscription_id
    );

    return Response.json(
      {
        success: true,
      },
      {
        headers: corsHeaders,
      }
    );
  } catch (err) {
    console.error(err);

    return Response.json(
      {
        error: String(err),
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});



// Deno.serve(async (req) => {
//   if (req.method === "OPTIONS") {
//     return new Response("ok", {
//       headers: corsHeaders,
//     });
//   }
//   const authHeader =
//     req.headers.get("Authorization");


//   const token =
//     authHeader?.replace("Bearer ", "");

//   const supabase = createClient(
//     Deno.env.get("SUPABASE_URL")!,
//     Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
//   );

//   const {
//     data: { user },
//   } = await supabase.auth.getUser(token);

//   if (!user) {
//     return Response.json(
//       { error: "Unauthorized" },
//       { status: 401 }
//     );
//   }

//   const { data: subscription } =
//     await supabase
//       .from("subscriptions")
//       .select("*")
//       .eq("user_id", user.id)
//       .single();

//   await stripe.subscriptions.update(
//     subscription.stripe_subscription_id,
//     {
//       cancel_at_period_end: true,
//     }
//   );

//   return Response.json({
//     success: true,
//   });
// });