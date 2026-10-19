// import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// import { OpenAI } from "https://deno.land/x/openai@v4.20.0/mod.ts";

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// };

// serve(async (req) => {
//   // Handle CORS preflight requests
//   if (req.method === 'OPTIONS') {
//     return new Response('ok', { headers: corsHeaders });
//   }

//   const { message } = await req.json();

//   const openai = new OpenAI({
//     apiKey: Deno.env.get("OPENAI_API_KEY"),
//   });

//   try {
//     const completion = await openai.chat.completions.create({
//       messages: [{ role: "user", content: message }],
//       model: "gpt-4o-mini",
//     });

//     const reply = completion.choices[0].message.content;

//     return new Response(JSON.stringify({ reply }), {
//       headers: { ...corsHeaders, "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     return new Response(JSON.stringify({ error: error.message }), {
//       status: 500,
//       headers: { ...corsHeaders, "Content-Type": "application/json" },
//     });
//   }
// });






import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OpenAI } from "https://deno.land/x/openai@v4.20.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { message } = await req.json();
    const apiKey = Deno.env.get("OPENAI_API_KEY");

    // DEBUG: Check if key exists
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set in Supabase Secrets");
    }

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: message }],
      model: "gpt-4o-mini",
    });

    return new Response(JSON.stringify({ reply: completion.choices[0].message.content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Function Error:", error); // This shows up in the CLI logs
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});