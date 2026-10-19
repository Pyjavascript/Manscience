// // import { serve } from "https://deno.land/std/http/server.ts";
// // import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// // const corsHeaders = {
// //   'Access-Control-Allow-Origin': '*', // Allows your React frontend to communicate with it
// //   'Access-Control-Allow-Methods': 'POST, OPTIONS',
// //   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// // }

// // serve(async (req) => {
// //   // 1. Handle CORS Preflight Options Request
// //   if (req.method === 'OPTIONS') {
// //     return new Response('ok', { headers: corsHeaders });
// //   }

// //   try {
// //     const body = await req.json();

// //     const supabase = createClient(
// //       Deno.env.get("SUPABASE_URL")!,
// //       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
// //     );

// //     // Don't forget to map the phone column you added earlier!
// //     const { data, error } = await supabase
// //       .from("practitioners")
// //       .insert({
// //         name: body.name,
// //         email: body.email,
// //         phone: body.phone, // Added mapping for your database column!
// //         specialization: body.specialization,
// //         education: body.education,
// //         experience: body.experience,
// //         approach_to_care: body.approach_to_care,
// //         therapies_offered: body.therapies_offered,
// //         research_papers: body.research_papers,
// //         profile_image: body.profile_image,
// //         certificate_images: body.certificate_images || [],
// //         status: "pending"
// //       })
// //       .select()
// //       .single();

// //     if (error) throw error;

// //     // 2. Return success response WITH CORS headers
// //     return Response.json(
// //       { success: true, practitioner: data },
// //       { headers: corsHeaders }
// //     );

// //   } catch (err) {
// //     // 3. Return error response WITH CORS headers
// //     return Response.json(
// //       { success: false, error: err.message },
// //       { status: 500, headers: corsHeaders }
// //     );
// //   }
// // });

// import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Methods': 'POST, OPTIONS',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// };

// serve(async (req) => {
//   // 1. Handle CORS Preflight Options Request
//   if (req.method === 'OPTIONS') {
//     return new Response('ok', { headers: corsHeaders });
//   }

//   try {
//     const url = Deno.env.get("SUPABASE_URL");
//     const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

//     // Clear structural checking guard to rule out secret initialization issues
//     if (!url || !serviceRole) {
//       return new Response(
//         JSON.stringify({ success: false, error: "Missing environmental credentials setup inside Supabase Vault dashboard." }),
//         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
//       );
//     }

//     const body = await req.json();
//     const supabaseClient = createClient(url, serviceRole);

//     // 2. Insert into the database. 
//     // We remove .single() here because if RLS or an insert constraint triggers a variance, 
//     // it will return an application layer response instead of crashing the runtime worker.
//     const { data, error } = await supabaseClient
//       .from("practitioners")
//       .insert([
//         {
//           name: body.name,
//           email: body.email,
//           phone: body.phone || null, 
//           specialization: body.specialization || null,
//           education: body.education || null,
//           experience: body.experience || null,
//           approach_to_care: body.approach_to_care || null,
//           therapies_offered: body.therapies_offered || null,
//           research_papers: body.research_papers || null,
//           profile_image: body.profile_image || null,
//           certificate_images: body.certificate_images || [],
//           status: "pending"
//         }
//       ])
//       .select();

//     if (error) {
//       return new Response(
//         JSON.stringify({ success: false, error: error.message, details: error.details }),
//         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
//       );
//     }

//     return new Response(
//       JSON.stringify({ success: true, practitioner: data?.[0] || null }),
//       { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
//     );

//   } catch (err) {
//     return new Response(
//       JSON.stringify({ success: false, error: err.message }),
//       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
//     );
//   }
// });

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

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
    const url = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!url || !serviceRole) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing environmental credentials setup inside Supabase Vault dashboard." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const supabaseClient = createClient(url, serviceRole);

    // 1. Core Insert inside Supabase Database Table
    const { data: dbData, error: dbError } = await supabaseClient
      .from("practitioners")
      .insert([
        {
          name: body.name,
          email: body.email,
          phone: body.phone || null, 
          specialization: body.specialization || null,
          education: body.education || null,
          experience: body.experience || null,
          approach_to_care: body.approach_to_care || null,
          therapies_offered: body.therapies_offered || null,
          research_papers: body.research_papers || null,
          profile_image: body.profile_image || null,
          certificate_images: body.certificate_images || [],
          status: "pending"
        }
      ])
      .select();

    if (dbError) {
      return new Response(
        JSON.stringify({ success: false, error: dbError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Dispatch data to Webflow CMS API v2 matching required schema structure
    let webflowItemData = null;
    
    if (WEBFLOW_API_TOKEN) {
      const baseSlug = body.name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
      const uniqueSuffix = Date.now().toString().slice(-4);
      
      // Map incoming certificates array into the structure Webflow demands
      const formattedCertificates = (body.certificate_images || []).map((img: any) => ({
        url: img.url,
        alt: img.alt || null
      }));

      const webflowPayload = {
        isArchived: false,
        isDraft: true,
        fieldData: {
          name: body.name,
          slug: `${baseSlug}-${uniqueSuffix}`,
          email: body.email,
          specialization: body.specialization || "General Practitioner",
          education: body.education || "N/A",
          experience: body.experience || "N/A",
          "approach-to-care": body.approach_to_care || "N/A",
          "therapies-offered": body.therapies_offered || "N/A",
          "research-papers": body.research_papers || "N/A",
          "certificate-images": formattedCertificates, // Dynamically parsed to structural blueprint objects
          // Map single image node wrapper element
          "image": body.profile_image ? { url: body.profile_image, alt: null } : null
        }
      };

      try {
        const webflowResponse = await fetch(`https://api.webflow.com/v2/collections/${PENDING_COLLECTION_ID}/items`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${WEBFLOW_API_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(webflowPayload)
        });

        if (!webflowResponse.ok) {
          const wfErrorText = await webflowResponse.text();
          console.error(`Webflow CMS API rejected sync parameters layout: ${wfErrorText}`);
          return new Response(
            JSON.stringify({ success: false, error: `Webflow API Sync Rejection: ${wfErrorText}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          webflowItemData = await webflowResponse.json();
        }
      } catch (wfFetchErr) {
        console.error("Failed executing out-of-bounds cross fetch:", wfFetchErr.message);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        practitioner: dbData?.[0] || null,
        webflowItemId: webflowItemData?.id || null 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});