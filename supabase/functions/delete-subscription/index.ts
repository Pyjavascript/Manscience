import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    } = await supabase.auth.getUser(token);

    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    await supabase
      .from("subscriptions")
      .delete()
      .eq("user_id", user.id);

    return Response.json(
      {
        success: true,
      },
      {
        headers: corsHeaders,
      }
    );
  } catch (err) {
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