// import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
//   'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
// }

// serve(async (req) => {
//   if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

//   try {
//     const token = Deno.env.get("WEBFLOW_API_TOKEN");
    
//     // Parse incoming URL to extract search parameters dynamically
//     const requestUrl = new URL(req.url);
//     const targetCollectionUrl = requestUrl.searchParams.get("collection");
    
//     // Handle GET Requests
//     if (req.method === 'GET') {
//       const collectionId = targetCollectionUrl || "6a19c17541e0a2e267e7184f";
//       const baseUrl = `https://api.webflow.com/v2/collections/${collectionId}/items`;
      
//       const response = await fetch(baseUrl, {
//         headers: { 'Authorization': `Bearer ${token}`, 'accept': 'application/json' }
//       });
//       const data = await response.json();
//       return new Response(JSON.stringify(data), { headers: corsHeaders, status: 200 });
//     }

//     // Handle POST Requests (Both Creation and Deletion routing)
//     if (req.method === 'POST') {
//       const body = await req.json();
      
//       // DYNAMIC COLLECTION SELECTION: Read from body first, then URL param, then default therapy string
//       const finalCollectionId = body.collectionId || targetCollectionUrl || "6a19c17541e0a2e267e7184f";

//       // Fix Deletion Root: Dynamic URL string construction
//       if (body.action === "delete" && body.itemId) {
//         const deleteUrl = `https://api.webflow.com/v2/collections/${finalCollectionId}/items/${body.itemId}`;
//         const response = await fetch(deleteUrl, {
//           method: 'DELETE',
//           headers: { 'Authorization': `Bearer ${token}` }
//         });
        
//         if (!response.ok) {
//           const errData = await response.text();
//           return new Response(JSON.stringify({ error: errData }), { headers: corsHeaders, status: response.status });
//         }
        
//         return new Response(JSON.stringify({ success: true, id: body.itemId }), { 
//           headers: corsHeaders, 
//           status: 200 
//         });
//       }

//       // Normal creation routing
//       const baseUrl = `https://api.webflow.com/v2/collections/${finalCollectionId}/items`;
//       const response = await fetch(baseUrl, {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'accept': 'application/json',
//           'content-type': 'application/json'
//         },
//         body: JSON.stringify(body)
//       });
//       const data = await response.json();
//       return new Response(JSON.stringify(data), { headers: corsHeaders, status: response.status });
//     }

//   } catch (error) {
//     return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 500 });
//   }
// });


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// 1. Standalone Function to Handle Fetching Items (GET)
async function handleGetItems(collectionId: string, token: string) {
  const baseUrl = `https://api.webflow.com/v2/collections/${collectionId}/items`;
  
  const response = await fetch(baseUrl, {
    headers: { 'Authorization': `Bearer ${token}`, 'accept': 'application/json' }
  });
  
  const data = await response.json();
  return new Response(JSON.stringify(data), { headers: corsHeaders, status: response.status });
}

// 2. Standalone Function to Handle Item Deletion (DELETE)
async function handleDeleteItem(collectionId: string, itemId: string, token: string) {
  const deleteUrl = `https://api.webflow.com/v2/collections/${collectionId}/items/${itemId}`;

  // Deleting the CMS item alone leaves the published page live, so unpublish it first.
  // 404 just means the item was never published.
  const unpublishResponse = await fetch(`${deleteUrl}/live`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!unpublishResponse.ok && unpublishResponse.status !== 404) {
    const errData = await unpublishResponse.text();
    return new Response(JSON.stringify({ error: `Failed to unpublish item: ${errData}` }), { headers: corsHeaders, status: unpublishResponse.status });
  }

  const response = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    const errData = await response.text();
    return new Response(JSON.stringify({ error: errData }), { headers: corsHeaders, status: response.status });
  }
  
  return new Response(JSON.stringify({ success: true, id: itemId }), { 
    headers: corsHeaders, 
    status: 200 
  });
}

// 3. Standalone Function to Handle Item Creation (POST)
async function handleCreateItem(collectionId: string, body: any, token: string) {
  const baseUrl = `https://api.webflow.com/v2/collections/${collectionId}/items`;
  
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'accept': 'application/json',
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  
  const data = await response.json();
  return new Response(JSON.stringify(data), { headers: corsHeaders, status: response.status });
}

// 4. Standalone Function to Handle Item Update (PATCH)
async function handleUpdateItem(collectionId: string, itemId: string, body: any, token: string) {
  const updateUrl = `https://api.webflow.com/v2/collections/${collectionId}/items/${itemId}`;

  // Only forward Webflow item properties, not our routing keys (action, itemId, collectionId)
  const updateBody: Record<string, unknown> = { fieldData: body.fieldData || {} };
  if (body.isArchived !== undefined) updateBody.isArchived = body.isArchived;
  if (body.isDraft !== undefined) updateBody.isDraft = body.isDraft;

  const response = await fetch(updateUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'accept': 'application/json',
      'content-type': 'application/json'
    },
    body: JSON.stringify(updateBody)
  });

  const data = await response.json();
  return new Response(JSON.stringify(data), { headers: corsHeaders, status: response.status });
}

// 5. Standalone Function to Publish Items to the live site (create/update only change the staged item)
async function handlePublishItems(collectionId: string, itemIds: string[], token: string) {
  const publishUrl = `https://api.webflow.com/v2/collections/${collectionId}/items/publish`;

  const response = await fetch(publishUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'accept': 'application/json',
      'content-type': 'application/json'
    },
    body: JSON.stringify({ itemIds })
  });

  const data = await response.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { headers: corsHeaders, status: response.status });
}

// --- Main Router Server Handler ---
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const token = Deno.env.get("WEBFLOW_API_TOKEN");
    if (!token) throw new Error("Missing WEBFLOW_API_TOKEN environment variable");

    const requestUrl = new URL(req.url);
    const targetCollectionUrl = requestUrl.searchParams.get("collection");
    
    // Fallback default collection ID if nothing else is specified
    const defaultCollectionId = "6a19c17541e0a2e267e7184f";

    // Route GET requests
    if (req.method === 'GET') {
      const collectionId = targetCollectionUrl || defaultCollectionId;
      return await handleGetItems(collectionId, token);
    }

    // Route POST requests
    if (req.method === 'POST') {
      const body = await req.json();
      const finalCollectionId = body.collectionId || targetCollectionUrl || defaultCollectionId;

      // Detect if the payload intent is a deletion activity
      if (body.action === "delete" && body.itemId) {
        return await handleDeleteItem(finalCollectionId, body.itemId, token);
      }

      // Detect if the payload intent is an update activity
      if (body.action === "update" && body.itemId) {
        return await handleUpdateItem(finalCollectionId, body.itemId, body, token);
      }

      // Detect if the payload intent is publishing items to the live site
      if (body.action === "publish" && Array.isArray(body.itemIds)) {
        return await handlePublishItems(finalCollectionId, body.itemIds, token);
      }

      // Never fall through to creation for an unrecognised action
      if (body.action) {
        return new Response(JSON.stringify({ error: `Unknown action "${body.action}"` }), { headers: corsHeaders, status: 400 });
      }

      // Default to normal creation activity
      return await handleCreateItem(finalCollectionId, body, token);
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { headers: corsHeaders, status: 405 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 500 });
  }
});