import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// Helper utility to convert base64 payload to a binary array buffer
import { decode } from "https://deno.land/std@0.177.0/encoding/base64.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle pre-flight CORS requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { recipientEmail, recipientName, pdfAttachment, fileName } = await req.json();

    if (!pdfAttachment) {
      throw new Error("Missing PDF attachment data string payload.");
    }

    // Convert the incoming base64 payload string back to a clean binary format byte array
    const byteArray = decode(pdfAttachment);

    // Fire request directly to Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        // FIX 1: Must use onboarding@resend.dev (or your verified domain). Do NOT use generic gmail here.
        from: 'Roadmap Generator <onboarding@resend.dev>', 
        to: [recipientEmail],
        subject: 'Your Cognitive Profile Evaluation Roadmap',
        html: `<p>Hello <strong>${recipientName}</strong>,</p><p>Please find attached your personalized Clinical Evaluation Profile Roadmap PDF compiled by our team.</p>`,
        attachments: [
          {
            filename: fileName,
            // FIX 2: Pass content as an array of byte numbers so fetch transfers it correctly
            content: Array.from(byteArray), 
          },
        ],
      }),
    });

    const resData = await res.json();
    if (!res.ok) {
      throw new Error(resData.message || `Resend rejected payload with code: ${res.status}`);
    }

    return new Response(JSON.stringify({ success: true, data: resData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})