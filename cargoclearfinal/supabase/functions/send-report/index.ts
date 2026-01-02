import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendReportRequest {
  type: 'statement_of_account' | 'revenue_report' | 'outstanding_report' | 'job_status_report' | 'customer_analysis_report';
  recipientEmail: string;
  recipientName: string;
  subject: string;
  htmlContent: string;
  companyName?: string;
  companyEmail?: string;
  csvBase64?: string;
  csvFilename?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received send-report request");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const payload: SendReportRequest = await req.json();
    console.log("Report type:", payload.type);
    console.log("Recipient:", payload.recipientEmail);

    // Build email payload for Resend API
    const emailPayload: {
      from: string;
      to: string[];
      subject: string;
      html: string;
      attachments?: { filename: string; content: string }[];
    } = {
      from: `${payload.companyName || 'CargoClear'} <onboarding@resend.dev>`,
      to: [payload.recipientEmail],
      subject: payload.subject,
      html: payload.htmlContent,
    };

    // Add CSV attachment if provided
    if (payload.csvBase64 && payload.csvFilename) {
      console.log("Adding CSV attachment:", payload.csvFilename);
      emailPayload.attachments = [
        {
          filename: payload.csvFilename,
          content: payload.csvBase64,
        },
      ];
    }

    // Send email using Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent:", emailResult);

    if (!emailResponse.ok) {
      throw new Error(emailResult.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, data: emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-report function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
