// supabase/functions/submit-application/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const WEBFLOW_API_TOKEN = Deno.env.get("WEBFLOW_API_TOKEN");
const PENDING_COLLECTION_ID = "6a1e964f74997b39b658ad45";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { name, email, specialization, education, experience, approachToCare, therapiesOffered, certificateImages } = body;

    // Generate explicit programmatic path safe slug constraints
    const inferredSlug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");

    // Construct the payload structure explicitly expected by Webflow API v2 specifications
    const payload = {
      isArchived: false,
      isDraft: true, // Forces it to go into drafts review state inside the pending collection
      fieldData: {
        name,
        slug: `${inferredSlug}-${Date.now().toString().slice(-4)}`,
        email,
        specialization: specialization || "General Practitioner",
        education: education || "N/A",
        experience: experience || "N/A",
        "approach-to-care": approachToCare || "N/A",
        "therapies-offered": therapiesOffered || "N/A",
        "certificate-images": certificateImages || [] // Safe initialization array objects matching publicUrl schemas
      }
    };

    const response = await fetch(`https://api.webflow.com/v2/collections/${PENDING_COLLECTION_ID}/items`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WEBFLOW_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webflow API rejected payload entry: ${errorText}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({ success: true, itemId: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});