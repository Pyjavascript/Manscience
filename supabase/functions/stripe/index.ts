
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
  console.log("START");

  const authHeader =
    req.headers.get("Authorization");

  console.log(
    "AUTH HEADER EXISTS",
    !!authHeader
  );

  if (!authHeader) {
    return Response.json(
      {
        error: "Missing Authorization header",
      },
      {
        status: 401,
        headers: corsHeaders,
      }
    );
  }

  const token =
    authHeader.replace("Bearer ", "");

  console.log(
    "TOKEN EXISTS",
    !!token
  );

  console.log(
    "SUPABASE_URL EXISTS",
    !!Deno.env.get("SUPABASE_URL")
  );

  console.log(
    "SERVICE_ROLE EXISTS",
    !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  console.log("CLIENT CREATED");

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  console.log("AUTH CHECK COMPLETE");

  if (authError || !user) {
    console.error(authError);

    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
        headers: corsHeaders,
      }
    );
  }

  console.log(
    "USER VERIFIED",
    user.id
  );

  // -----------------------------
  // READ BODY
  // -----------------------------

  const { plan } =
    await req.json();

  console.log("PLAN", plan);

  // -----------------------------
  // PLAN LOOKUP
  // -----------------------------

  const plans: Record<string, string> = {
    go: "price_1TdEkdLbWXnlXzxMHrDTMd6S",
    growth:
      "price_1TdElXLbWXnlXzxM1cx2PkwM",
    pro: "price_1TdEm8LbWXnlXzxMAcadq1RR",
  };

  const priceId = plans[plan];

  console.log(
    "PRICE ID",
    priceId
  );

  if (!priceId) {
    return Response.json(
      {
        error: "Invalid plan",
      },
      {
        status: 400,
        headers: corsHeaders,
      }
    );
  }

  // -----------------------------
  // STRIPE
  // -----------------------------

  console.log("BEFORE STRIPE");

  const session =
    await stripe.checkout.sessions.create({
      mode: "subscription",

      client_reference_id:
        user.id,

      metadata: {
        plan,
        user_id: user.id,
      },

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      success_url:
        "https://manascience.webflow.io/success",

      cancel_url:
        "https://manascience.webflow.io/cancel",
    });


  console.log("AFTER STRIPE",session);

  return Response.json(
    {
      url: session.url,
    },
    {
      headers: corsHeaders,
    }
  );
} catch (err) {
  console.error(err);

  return Response.json(
    {
      error:
        err instanceof Error
          ? err.message
          : String(err),
    },
    {
      status: 500,
      headers: corsHeaders,
    }
  );
}
});