// import { serve } from "https://deno.land/std/http/server.ts";
// import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// serve(async (req) => {
//   try {
//     const url = new URL(req.url);

//     const status =
//       url.searchParams.get("status") || "pending";

//     const supabase = createClient(
//       Deno.env.get("SUPABASE_URL")!,
//       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
//     );

//     const { data, error } = await supabase
//       .from("practitioners")
//       .select("*")
//       .eq("status", status)
//       .order("created_at", {
//         ascending: false
//       });

//     if (error) throw error;

//     const practitioners = (data || []).map((p) => ({
//       ...p,

//       image: p.profile_image
//         ? {
//             url: p.profile_image
//           }
//         : null,

//       "certificate-images":
//         p.certificate_images || [],

//       "approach-to-care":
//         p.approach_to_care,

//       "therapies-offered":
//         p.therapies_offered,

//       "research-papers":
//         p.research_papers
//     }));

//     return Response.json({
//       practitioners,
//       total: practitioners.length
//     });
//   } catch (err) {
//     return Response.json(
//       {
//         error: err.message
//       },
//       { status: 500 }
//     );
//   }
// });

// // import { serve } from "https://deno.land/std/http/server.ts";
// // import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// // // Mandatory headers to prevent CORS blocks in the browser
// // const corsHeaders = {
// //   'Access-Control-Allow-Origin': '*',
// //   'Access-Control-Allow-Methods': 'GET, OPTIONS',
// //   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// // };

// // serve(async (req) => {
// //   // 1. Handle browser preflight check
// //   if (req.method === 'OPTIONS') {
// //     return new Response('ok', { headers: corsHeaders });
// //   }

// //   try {
// //     const url = new URL(req.url);
// //     const status = url.searchParams.get("status") || "pending";

// //     const supabase = createClient(
// //       Deno.env.get("SUPABASE_URL")!,
// //       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
// //     );

// //     const { data, error } = await supabase
// //       .from("practitioners")
// //       .select("*")
// //       .eq("status", status)
// //       .order("created_at", { ascending: false });

// //     if (error) throw error;

// //     const practitioners = (data || []).map((p) => ({
// //       ...p,
// //       image: p.profile_image ? { url: p.profile_image } : null,
// //       "certificate-images": p.certificate_images || [],
// //       "approach-to-care": p.approach_to_care,
// //       "therapies-offered": p.therapies_offered,
// //       "research-papers": p.research_papers
// //     }));

// //     // 2. Attach CORS headers to successful response
// //     return Response.json(
// //       { practitioners, total: practitioners.length },
// //       { headers: corsHeaders }
// //     );
// //   } catch (err) {
// //     // 3. Attach CORS headers to error response
// //     return Response.json(
// //       { error: err.message },
// //       { status: 500, headers: corsHeaders }
// //     );
// //   }
// // });









// supabase/functions/get-practitioners/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const WEBFLOW_API_TOKEN = Deno.env.get("WEBFLOW_API_TOKEN");
const PENDING_COLLECTION_ID = "6a1e964f74997b39b658ad45";
const APPROVED_COLLECTION_ID = "6a28140bfb48ad761c949151";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "pending";

    // Select target collection based on requested sub-tab status
    const targetCollectionId = status === "pending" ? PENDING_COLLECTION_ID : APPROVED_COLLECTION_ID;

    // Fetch directly from Webflow CMS API v2
    const response = await fetch(`https://api.webflow.com/v2/collections/${targetCollectionId}/items`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${WEBFLOW_API_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webflow API error: ${errorText}`);
    }

    const data = await response.json();
    const items = data.items || [];

    // Map Webflow data fields to match your frontend Dashboard expectations
    const practitioners = items.map((item: any) => {
      const fields = item.fieldData || {};
      
      return {
        id: item.id,
        name: fields.name || "Unknown",
        // Extracting properties clean for the dashboard table view maps
        email: fields.email || `${fields.slug || "practitioner"}@domain.com`,
        slug: fields.slug,
        
        // This structural layout is vital for your Modal Architecture variables
        education: fields.education || "N/A",
        therapiesOffered: fields["therapies-offered"] || fields.therapies || "N/A",
        approachToCare: fields["approach-to-care"] || "N/A",
        
        // Flattening certificates into a clean array of image URLs for the modal mapping loops
        certificateImages: Array.isArray(fields["certificate-images"]) 
          ? fields["certificate-images"].map((img: any) => img.url)
          : Array.isArray(fields["certificate-image"])
            ? fields["certificate-image"].map((img: any) => img.url)
            : [],
            
        // Preserving raw context object blocks to prevent front-end fallback crashes
        rawFieldData: fields
      };
    });

    return new Response(
      JSON.stringify({ practitioners, total: practitioners.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});