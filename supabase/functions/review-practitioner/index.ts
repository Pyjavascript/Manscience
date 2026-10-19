// import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
// const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
// const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// }

// serve(async (req) => {
//   if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

//   try {
//     const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
//     const { action, itemId } = await req.json();

//     if (action !== 'approve') {
//       // Standard catch-all handler fallback routing rules for default metrics updates
//       const { data, error } = await supabase.from('practitioners').update({ status: action === 'reject' ? 'rejected' : 'pending' }).eq('id', itemId).select();
//       if (error) throw error;
//       return new Response(JSON.stringify({ success: true, data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
//     }

//     // Process targeted practitioner item record
//     const { data: practitioner, error: fetchErr } = await supabase.from('practitioners').select('*').eq('id', itemId).single();
//     if (fetchErr || !practitioner) throw new Error("Target practitioner profile records missing.");

//     // Auto-generate credentials
//     const cleanName = practitioner.name.toLowerCase().replace(/[^a-z0-9]/g, '');
//     const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
//     const generatedUsername = `${cleanName}${uniqueSuffix}`;
//     const rawTemporaryPassword = Math.random().toString(36).slice(-10) + '!';

//     // Hash password string using internal database pgcrypto execution pipelines
//     const { data: rpcData, error: hashErr } = await supabase.rpc('crypt', { digest: rawTemporaryPassword, salt: '$2a$06$DCq7YgM.VwBc27856TEK9U' }); // Fallback inline standard hashing pattern wrapper
//     const hashedPassword = rpcData || rawTemporaryPassword; 

//     // Update table registry state flags
//     const { error: updateErr } = await supabase.from('practitioners').update({
//       status: 'live',
//       username: generatedUsername,
//       password_hash: hashedPassword
//     }).eq('id', itemId);

//     if (updateErr) throw updateErr;

//     // Relay onboarding message via Resend
//     const emailRes = await fetch('https://api.resend.com/emails', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${RESEND_API_KEY}`,
//       },
//       body: JSON.stringify({
//         from: 'ManaScience Support <onboarding@resend.dev>',
//         to: [practitioner.email],
//         subject: 'Congratulations! Your ManaScience Application Has Been Approved',
//         html: `
//           <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
//             <h2 style="color: #10b981;">Welcome to ManaScience!</h2>
//             <p>Hello <strong>${practitioner.name}</strong>,</p>
//             <p>We are absolutely thrilled to inform you that your application has been verified and approved. You are now live on our expert practitioner directory directories network.</p>
//             <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
//             <p>Your secure account workspace portal credentials have been initialized below:</p>
//             <div style="background-color: #f7fafc; padding: 16px; border-radius: 8px; font-family: monospace; margin: 16px 0;">
//               <strong>Username:</strong> ${generatedUsername}<br/>
//               <strong>Temporary Password:</strong> ${rawTemporaryPassword}
//             </div>
//             <p style="font-size: 12px; color: #a0aec0;">Please sign in to your provider hub layout panel environment using these parameter settings keys to update your parameters data files sheets.</p>
//           </div>
//         `
//       })
//     });

//     return new Response(JSON.stringify({ success: true, username: generatedUsername }), {
//       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       status: 200,
//     });
//   } catch (err) {
//     return new Response(JSON.stringify({ error: err.message }), {
//       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       status: 400,
//     });
//   }
// })
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const WEBFLOW_API_TOKEN = Deno.env.get("WEBFLOW_API_TOKEN");

const PENDING_COLLECTION_ID = "6a1e964f74997b39b658ad45";
const LIVE_COLLECTION_ID = "6a28140bfb48ad761c949151";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isValidUUID(uuid: string) {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { action, itemId } = await req.json();

    if (action === 'reject') {
      let query = supabase.from('practitioners').update({ status: 'rejected' });
      if (isValidUUID(itemId)) {
        query = query.eq('id', itemId);
      } else {
        query = query.eq('username', itemId);
      }
      const { data, error } = await query.select();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Resolve Practitioner Data
    let webflowItem = null;
    let rawName = "Unknown Practitioner";
    let rawEmail = null;
    let fields = {};

    if (WEBFLOW_API_TOKEN && !isValidUUID(itemId)) {
      const wfRes = await fetch(`https://api.webflow.com/v2/collections/${PENDING_COLLECTION_ID}/items/${itemId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${WEBFLOW_API_TOKEN}` }
      });
      
      if (wfRes.ok) {
        webflowItem = await wfRes.json();
        fields = webflowItem.fieldData || {};
        rawName = webflowItem.fieldData?.name || rawName;
        rawEmail = webflowItem.fieldData?.email;
      }
    }

    let dbQuery = supabase.from('practitioners').select('*');
    if (isValidUUID(itemId)) {
      dbQuery = dbQuery.eq('id', itemId);
    } else if (rawEmail) {
      dbQuery = dbQuery.eq('email', rawEmail);
    } else {
      throw new Error("Could not resolve a valid UUID database key or email reference index.");
    }

    const { data: practitioner, error: fetchErr } = await dbQuery.maybeSingle();
    const pRecord: any = practitioner || {};
    if (!practitioner && !webflowItem) {
      throw new Error("Target practitioner profile records missing across both database and Webflow platforms.");
    }

    const rawSpecialization = pRecord.specialization || fields.specialization || "General Practitioner";
    const rawEducation = pRecord.education || fields.education || "N/A";
    const rawExperience = pRecord.experience || fields.experience || "N/A";
    const rawApproach = pRecord.approach_to_care || fields["approach-to-care"] || fields.approach_to_care || "N/A";
    const rawTherapies = pRecord.therapies_offered || fields["therapies-offered"] || fields.therapies_offered || "N/A";
    const rawResearch = pRecord.research_papers || fields["research-papers"] || fields.research_papers || "N/A";
    
    rawName = pRecord.name || rawName;
    const finalEmail = pRecord.email || rawEmail;

    // 1. Generate clean unique strings credentials
    const cleanName = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
    const generatedUsername = cleanName ? `${cleanName}${uniqueSuffix}` : `practitioner${uniqueSuffix}`;
    const generatedPassword = Math.random().toString(36).slice(-10) + 'M!';
    const loginEmail = finalEmail || `${generatedUsername}@manascience.com`;

    // 2. Create secure user account within Supabase Auth Engine
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: loginEmail,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { displayName: rawName, username: generatedUsername, role: 'practitioner' }
    });

    if (authError) {
      if (!authError.message.includes("already been registered")) throw authError;
    }

    const linkedUserId = authUser?.user?.id || null;

    // 3. Move Item to Live Directory Collection in Webflow
    if (WEBFLOW_API_TOKEN) {
      const baseSlug = rawName.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
      const computedSlug = `${baseSlug}-${uniqueSuffix}-${Date.now().toString().slice(-4)}`;
      
      const rawCerts = pRecord.certificate_images || fields["certificate-images"] || fields["certificate-image"] || [];
      const formattedCerts = Array.isArray(rawCerts) 
        ? rawCerts.map((img: any) => ({ url: img.url || img, alt: img.alt || null }))
        : [];

      // FIX: Aligned all field payload keys perfectly to match your website live schema rules
      const webflowPayload = {
        isArchived: false,
        isDraft: false, 
        fieldData: {
          name: rawName,
          slug: computedSlug,
          email: loginEmail,
          specialization: rawSpecialization,
          education: rawEducation,
          experience: rawExperience,
          "approach-to-care": rawApproach,
          "therapies": rawTherapies,             // Fixed to match Live Schema Key name
          "research-papers": rawResearch,
          "certificate-image": formattedCerts,    // Fixed to match Live Schema Key name (singular)
          "image-2": pRecord.profile_image ? { url: pRecord.profile_image, alt: null } : (fields.image?.url ? { url: fields.image.url, alt: null } : null) // Fixed to image-2
        }
      };

      const liveWfRes = await fetch(`https://api.webflow.com/v2/collections/${LIVE_COLLECTION_ID}/items`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WEBFLOW_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(webflowPayload)
      });

      if (!liveWfRes.ok) {
        const errLog = await liveWfRes.text();
        throw new Error(`Webflow Directory Publish Rejected: ${errLog}`);
      }

      const deleteId = webflowItem?.id || itemId;
      if (deleteId && !isValidUUID(deleteId)) {
        const deleteRes = await fetch(`https://api.webflow.com/v2/collections/${PENDING_COLLECTION_ID}/items/${deleteId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${WEBFLOW_API_TOKEN}` }
        });
        await deleteRes.text();
      }
    }

    // 4. Synchronize Database Record Status Flag
    let dbUpdate = supabase.from('practitioners').update({
      status: 'live',
      username: generatedUsername,
      user_id: linkedUserId,
      email: loginEmail
    });

    if (pRecord.id) {
      dbUpdate = dbUpdate.eq('id', pRecord.id);
    } else {
      dbUpdate = dbUpdate.eq('email', loginEmail);
    }

    const { error: updateErr } = await dbUpdate;
    if (updateErr) throw updateErr;

    // 5. Dispatch onboarding confirmation notification email via Resend
    if (RESEND_API_KEY && loginEmail && !loginEmail.endsWith("@manascience.com")) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'ManaScience Support <onboarding@resend.dev>',
          to: [loginEmail],
          subject: 'Congratulations! Your ManaScience Application Has Been Approved',
          html: `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; background-color: #ffffff;">
              <h2 style="color: #10b981; margin-top: 0;">Application Approved!</h2>
              <p>Hello <strong>${rawName}</strong>,</p>
              <p>Your professional profile is now live in our network directory.</p>
              <div style="background-color: #f6fbf9; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <h4 style="margin: 0 0 8px 0; color: #111827;">Your Secure Portal Credentials:</h4>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Login Identifier Email:</strong> ${loginEmail}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background: #e6f4ea; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${generatedPassword}</code></p>
              </div>
            </div>
          `
        }),
      });
    }

    return new Response(JSON.stringify({ success: true, username: generatedUsername }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});