import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'invoice_created' | 'payment_received' | 'payment_reminder' | 'overdue_notice';
  recipientEmail: string;
  recipientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate?: string;
  paymentDate?: string;
  paymentMethod?: string;
  daysOverdue?: number;
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  pdfBase64?: string;
  userId?: string;
}

const DEFAULT_TEMPLATES: Record<string, { subject: string; body_html: string }> = {
  invoice_created: {
    subject: 'Invoice {{invoice_number}} from {{company_name}}',
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Invoice</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; color: #333;">Dear {{customer_name}},</p>
    <p style="font-size: 14px; color: #555; line-height: 1.6;">
      Please find attached invoice <strong>{{invoice_number}}</strong> for the amount of <strong>{{currency}}{{amount}}</strong>.
    </p>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #666;">Invoice Number:</td><td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right;">{{invoice_number}}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Amount Due:</td><td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right;">{{currency}}{{amount}}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Due Date:</td><td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right;">{{due_date}}</td></tr>
      </table>
    </div>
    <p style="font-size: 14px; color: #555; line-height: 1.6;">Please ensure payment is made by the due date.</p>
    <p style="font-size: 14px; color: #555; margin-top: 30px;">Best regards,<br><strong>{{company_name}}</strong></p>
  </div>
  <div style="background: #f8f9fa; padding: 20px; text-align: center; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 12px; color: #999; margin: 0;">{{company_address}}<br>{{company_email}} | {{company_phone}}</p>
  </div>
</div>`,
  },
  payment_received: {
    subject: 'Payment Received - Thank You! ({{invoice_number}})',
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Payment Received</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; color: #333;">Dear {{customer_name}},</p>
    <p style="font-size: 14px; color: #555; line-height: 1.6;">
      Thank you for your payment of <strong>{{currency}}{{amount}}</strong> for invoice <strong>{{invoice_number}}</strong>.
    </p>
    <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <div style="font-size: 24px; color: #28a745; margin-bottom: 10px;">✓</div>
      <p style="font-size: 18px; color: #155724; margin: 0; font-weight: bold;">Payment Confirmed</p>
    </div>
    <p style="font-size: 14px; color: #555; margin-top: 30px;">Best regards,<br><strong>{{company_name}}</strong></p>
  </div>
  <div style="background: #f8f9fa; padding: 20px; text-align: center; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 12px; color: #999; margin: 0;">{{company_address}}<br>{{company_email}} | {{company_phone}}</p>
  </div>
</div>`,
  },
  payment_reminder: {
    subject: 'Payment Reminder - Invoice {{invoice_number}}',
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #fd7e14 0%, #ffc107 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Payment Reminder</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; color: #333;">Dear {{customer_name}},</p>
    <p style="font-size: 14px; color: #555; line-height: 1.6;">
      This is a friendly reminder that invoice <strong>{{invoice_number}}</strong> for <strong>{{currency}}{{amount}}</strong> is due on <strong>{{due_date}}</strong>.
    </p>
    <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
      <p style="font-size: 14px; color: #856404; margin: 0;"><strong>Outstanding Balance:</strong> {{currency}}{{amount}}</p>
    </div>
    <p style="font-size: 14px; color: #555; margin-top: 30px;">Best regards,<br><strong>{{company_name}}</strong></p>
  </div>
  <div style="background: #f8f9fa; padding: 20px; text-align: center; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 12px; color: #999; margin: 0;">{{company_address}}<br>{{company_email}} | {{company_phone}}</p>
  </div>
</div>`,
  },
  overdue_notice: {
    subject: 'OVERDUE: Invoice {{invoice_number}}',
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Overdue Notice</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; color: #333;">Dear {{customer_name}},</p>
    <p style="font-size: 14px; color: #555; line-height: 1.6;">
      Invoice <strong>{{invoice_number}}</strong> is now <strong>{{days_overdue}} days overdue</strong>. Outstanding amount: <strong>{{currency}}{{amount}}</strong>.
    </p>
    <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
      <p style="font-size: 14px; color: #721c24; margin: 0;"><strong>⚠ This invoice is {{days_overdue}} days past due</strong></p>
    </div>
    <p style="font-size: 14px; color: #555;">Please arrange for immediate payment.</p>
    <p style="font-size: 14px; color: #555; margin-top: 30px;">Best regards,<br><strong>{{company_name}}</strong></p>
  </div>
  <div style="background: #f8f9fa; padding: 20px; text-align: center; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 12px; color: #999; margin: 0;">{{company_address}}<br>{{company_email}} | {{company_phone}}</p>
  </div>
</div>`,
  },
};

const replaceVariables = (template: string, variables: Record<string, string>): string => {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  });
  return result;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Received notification request");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const payload: NotificationRequest = await req.json();
    console.log("Notification type:", payload.type);
    console.log("Recipient:", payload.recipientEmail);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch custom template if userId is provided
    let template = DEFAULT_TEMPLATES[payload.type];
    
    if (payload.userId) {
      console.log("Fetching custom template for user:", payload.userId);
      const { data: customTemplate, error } = await supabase
        .from('email_templates')
        .select('subject, body_html, is_active')
        .eq('user_id', payload.userId)
        .eq('template_type', payload.type)
        .single();
      
      if (!error && customTemplate && customTemplate.is_active) {
        console.log("Using custom template");
        template = {
          subject: customTemplate.subject,
          body_html: customTemplate.body_html,
        };
      }
    }

    const variables: Record<string, string> = {
      customer_name: payload.recipientName,
      invoice_number: payload.invoiceNumber,
      amount: payload.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }),
      due_date: payload.dueDate || '',
      payment_date: payload.paymentDate || '',
      payment_method: payload.paymentMethod || '',
      days_overdue: payload.daysOverdue?.toString() || '',
      currency: '$',
      company_name: payload.companyName || 'CargoClear',
      company_address: payload.companyAddress || '',
      company_email: payload.companyEmail || '',
      company_phone: payload.companyPhone || '',
    };

    const subject = replaceVariables(template.subject, variables);
    const htmlContent = replaceVariables(template.body_html, variables);

    console.log("Sending email with subject:", subject);

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
      subject,
      html: htmlContent,
    };

    // Add PDF attachment if provided
    if (payload.pdfBase64) {
      console.log("Adding PDF attachment");
      emailPayload.attachments = [
        {
          filename: `${payload.invoiceNumber}.pdf`,
          content: payload.pdfBase64,
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
    console.error("Error in send-notification function:", error);
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
