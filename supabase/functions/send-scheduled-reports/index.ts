import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { format } from "https://esm.sh/date-fns@3.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduledReport {
  id: string;
  user_id: string;
  report_type: string;
  frequency: string;
  day_of_week: number | null;
  day_of_month: number | null;
  email_recipient: string;
  is_active: boolean;
}

interface Profile {
  company_name: string | null;
  company_email: string | null;
  date_format: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Starting scheduled reports job");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Check for test mode
    let testMode = false;
    let scheduleId: string | null = null;
    
    try {
      const body = await req.json();
      testMode = body.testMode === true;
      scheduleId = body.scheduleId || null;
    } catch {
      // No body or invalid JSON - continue with normal scheduled mode
    }

    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const currentDayOfMonth = now.getDate();
    
    console.log(`Test mode: ${testMode}, Schedule ID: ${scheduleId}`);
    console.log(`Current day of week: ${currentDayOfWeek}, day of month: ${currentDayOfMonth}`);

    let reportsToSend: ScheduledReport[] = [];

    if (testMode && scheduleId) {
      // Test mode: send just the specified schedule immediately
      const { data: schedule, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .eq('id', scheduleId)
        .single();
      
      if (error) throw error;
      if (schedule) {
        reportsToSend = [schedule];
      }
    } else {
      // Normal mode: fetch all active scheduled reports
      const { data: schedules, error: schedulesError } = await supabase
        .from('scheduled_reports')
        .select('*')
        .eq('is_active', true);

      if (schedulesError) throw schedulesError;
      console.log(`Found ${schedules?.length || 0} active schedules`);

      for (const schedule of schedules || []) {
        let shouldSend = false;

        switch (schedule.frequency) {
          case 'daily':
            shouldSend = true;
            break;
          case 'weekly':
            shouldSend = schedule.day_of_week === currentDayOfWeek;
            break;
          case 'monthly':
            shouldSend = schedule.day_of_month === currentDayOfMonth;
            break;
        }

        if (shouldSend) {
          reportsToSend.push(schedule);
        }
      }
    }

    console.log(`${reportsToSend.length} reports to send`);

    // Process each report
    for (const schedule of reportsToSend) {
      try {
        console.log(`Processing ${schedule.report_type} for ${schedule.email_recipient}`);

        // Get user profile for company info
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_name, company_email, date_format')
          .eq('id', schedule.user_id)
          .single();

        const dateFormat = profile?.date_format || 'dd-MM-yyyy';
        const formattedDate = format(now, dateFormat);
        
        // Generate report data based on type
        let reportData = '';
        let reportTitle = '';
        let csvContent = '';

        switch (schedule.report_type) {
          case 'revenue':
            reportTitle = 'Revenue Report';
            const { data: revenueData } = await supabase
              .from('invoices')
              .select('*')
              .eq('user_id', schedule.user_id)
              .gte('issue_date', format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd'));
            
            const totalRevenue = revenueData?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
            const paidAmount = revenueData?.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0) || 0;
            
            reportData = `
              <p>Total Invoices: ${revenueData?.length || 0}</p>
              <p>Total Revenue: $${totalRevenue.toFixed(2)}</p>
              <p>Amount Collected: $${paidAmount.toFixed(2)}</p>
              <p>Outstanding: $${(totalRevenue - paidAmount).toFixed(2)}</p>
            `;
            
            csvContent = 'Invoice Number,Issue Date,Total Amount,Paid Amount,Status\n';
            revenueData?.forEach(inv => {
              csvContent += `${inv.invoice_number},${inv.issue_date},${inv.total_amount},${inv.paid_amount || 0},${inv.status}\n`;
            });
            break;

          case 'outstanding':
            reportTitle = 'Outstanding Payments Report';
            const { data: outstandingData } = await supabase
              .from('invoices')
              .select('*, customers(name)')
              .eq('user_id', schedule.user_id)
              .not('status', 'eq', 'paid')
              .not('status', 'eq', 'void');
            
            const totalOutstanding = outstandingData?.reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0) || 0;
            
            reportData = `
              <p>Outstanding Invoices: ${outstandingData?.length || 0}</p>
              <p>Total Outstanding: $${totalOutstanding.toFixed(2)}</p>
            `;
            
            csvContent = 'Invoice Number,Customer,Due Date,Total Amount,Paid Amount,Outstanding\n';
            outstandingData?.forEach(inv => {
              const outstanding = inv.total_amount - (inv.paid_amount || 0);
              csvContent += `${inv.invoice_number},${(inv.customers as any)?.name || 'N/A'},${inv.due_date},${inv.total_amount},${inv.paid_amount || 0},${outstanding}\n`;
            });
            break;

          case 'job_status':
            reportTitle = 'Job Status Report';
            const { data: jobsData } = await supabase
              .from('jobs')
              .select('*')
              .eq('user_id', schedule.user_id);
            
            const statusCounts: Record<string, number> = {};
            jobsData?.forEach(job => {
              const status = job.status || 'pending';
              statusCounts[status] = (statusCounts[status] || 0) + 1;
            });
            
            reportData = `
              <p>Total Jobs: ${jobsData?.length || 0}</p>
              ${Object.entries(statusCounts).map(([status, count]) => 
                `<p>${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}</p>`
              ).join('')}
            `;
            
            csvContent = 'Job Number,Customer ID,Description,Status,Created At\n';
            jobsData?.forEach(job => {
              csvContent += `${job.job_number},${job.customer_id},${job.description?.substring(0, 50) || ''},${job.status},${job.created_at}\n`;
            });
            break;

          case 'customer_analysis':
            reportTitle = 'Customer Analysis Report';
            const { data: customersData } = await supabase
              .from('customers')
              .select('*')
              .eq('user_id', schedule.user_id);
            
            const activeCustomers = customersData?.filter(c => c.status === 'active').length || 0;
            const totalBalance = customersData?.reduce((sum, c) => sum + (c.current_balance || 0), 0) || 0;
            
            reportData = `
              <p>Total Customers: ${customersData?.length || 0}</p>
              <p>Active Customers: ${activeCustomers}</p>
              <p>Total Outstanding Balance: $${totalBalance.toFixed(2)}</p>
            `;
            
            csvContent = 'Customer Name,Status,Current Balance,Credit Limit,Payment Terms\n';
            customersData?.forEach(c => {
              csvContent += `${c.name},${c.status},${c.current_balance || 0},${c.credit_limit || 0},${c.payment_terms || 30}\n`;
            });
            break;
        }

        // Build email HTML
        const htmlContent = `
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #1e3a5f;">${reportTitle}</h1>
              <p style="color: #666;">Report generated on ${formattedDate}</p>
              <hr style="border: 1px solid #eee; margin: 20px 0;">
              ${reportData}
              <hr style="border: 1px solid #eee; margin: 20px 0;">
              <p style="color: #888; font-size: 12px;">
                This is an automated scheduled report from ${profile?.company_name || 'CargoClear'}.
                <br>You can manage your report schedules in the Settings page.
              </p>
            </body>
          </html>
        `;

        // Convert CSV to base64
        const csvBase64 = btoa(csvContent);
        const csvFilename = `${schedule.report_type}_report_${format(now, 'yyyy-MM-dd')}.csv`;

        // Send email via Resend
        const emailPayload = {
          from: `${profile?.company_name || 'CargoClear'} <onboarding@resend.dev>`,
          to: [schedule.email_recipient],
          subject: `[Scheduled] ${reportTitle} - ${formattedDate}`,
          html: htmlContent,
          attachments: [
            {
              filename: csvFilename,
              content: csvBase64,
            },
          ],
        };

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify(emailPayload),
        });

        const emailResult = await emailResponse.json();
        
        if (!emailResponse.ok) {
          console.error(`Failed to send ${schedule.report_type} to ${schedule.email_recipient}:`, emailResult);
        } else {
          console.log(`Successfully sent ${schedule.report_type} to ${schedule.email_recipient}`);
          
          // Update last_sent_at
          await supabase
            .from('scheduled_reports')
            .update({ last_sent_at: now.toISOString() })
            .eq('id', schedule.id);
        }
      } catch (error) {
        console.error(`Error processing schedule ${schedule.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: reportsToSend.length,
        message: `Processed ${reportsToSend.length} scheduled reports` 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in scheduled reports job:", error);
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
