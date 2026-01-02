import { supabase } from '@/integrations/supabase/client';

interface SendReportEmailParams {
  type: 'statement_of_account' | 'revenue_report' | 'outstanding_report' | 'job_status_report' | 'customer_analysis_report';
  recipientEmail: string;
  recipientName: string;
  subject: string;
  reportTitle: string;
  reportDate: string;
  summaryHtml: string;
  companyName?: string;
  companyEmail?: string;
  csvData?: string;
  csvFilename?: string;
}

const generateReportEmailHtml = (params: SendReportEmailParams): string => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${params.reportTitle}</h1>
        <p style="color: #e0e0e0; margin: 10px 0 0 0; font-size: 14px;">Generated on ${params.reportDate}</p>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
        <p style="font-size: 16px; color: #333;">Dear ${params.recipientName},</p>
        <p style="font-size: 14px; color: #555; line-height: 1.6;">
          Please find the requested report below. ${params.csvData ? 'A CSV file is attached for your records.' : ''}
        </p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ${params.summaryHtml}
        </div>
        <p style="font-size: 14px; color: #555; margin-top: 30px;">Best regards,<br><strong>${params.companyName || 'CargoClear'}</strong></p>
      </div>
      <div style="background: #f8f9fa; padding: 20px; text-align: center; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="font-size: 12px; color: #999; margin: 0;">This is an automated report from ${params.companyName || 'CargoClear'}</p>
      </div>
    </div>
  `;
};

export const sendStatementEmail = async (params: {
  recipientEmail: string;
  recipientName: string;
  customerName: string;
  transactions: { date: string; type: string; reference: string; description: string; debit: number; credit: number; balance: number }[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  statementDate: string;
  companyName?: string;
  companyEmail?: string;
  csvData?: string;
}): Promise<{ success: boolean; error?: string }> => {
  const transactionsHtml = params.transactions.slice(0, 10).map(t => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-size: 12px;">${t.date}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-size: 12px;">${t.reference}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-size: 12px; text-align: right;">${t.debit > 0 ? `$${t.debit.toFixed(2)}` : '-'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-size: 12px; text-align: right; color: #28a745;">${t.credit > 0 ? `$${t.credit.toFixed(2)}` : '-'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-size: 12px; text-align: right; font-weight: bold;">$${t.balance.toFixed(2)}</td>
    </tr>
  `).join('');

  const summaryHtml = `
    <h3 style="margin: 0 0 15px 0; color: #1e3a5f;">Statement for ${params.customerName}</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
      <thead>
        <tr style="background: #e9ecef;">
          <th style="padding: 10px; text-align: left; font-size: 12px;">Date</th>
          <th style="padding: 10px; text-align: left; font-size: 12px;">Reference</th>
          <th style="padding: 10px; text-align: right; font-size: 12px;">Debit</th>
          <th style="padding: 10px; text-align: right; font-size: 12px;">Credit</th>
          <th style="padding: 10px; text-align: right; font-size: 12px;">Balance</th>
        </tr>
      </thead>
      <tbody>
        ${transactionsHtml}
        ${params.transactions.length > 10 ? `<tr><td colspan="5" style="padding: 8px; text-align: center; color: #666; font-size: 12px;">... and ${params.transactions.length - 10} more transactions (see attached CSV)</td></tr>` : ''}
      </tbody>
    </table>
    <div style="background: #fff; padding: 15px; border-radius: 4px; border: 1px solid #e0e0e0;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #666;">Total Invoiced:</span>
        <span style="font-weight: bold;">$${params.totalDebit.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #666;">Total Paid:</span>
        <span style="font-weight: bold; color: #28a745;">$${params.totalCredit.toFixed(2)}</span>
      </div>
      <div style="border-top: 2px solid #1e3a5f; padding-top: 8px; display: flex; justify-content: space-between;">
        <span style="font-weight: bold;">Balance Due:</span>
        <span style="font-weight: bold; color: ${params.closingBalance > 0 ? '#dc3545' : '#28a745'};">$${params.closingBalance.toFixed(2)}</span>
      </div>
    </div>
  `;

  const htmlContent = generateReportEmailHtml({
    type: 'statement_of_account',
    recipientEmail: params.recipientEmail,
    recipientName: params.recipientName,
    subject: `Statement of Account - ${params.customerName}`,
    reportTitle: 'Statement of Account',
    reportDate: params.statementDate,
    summaryHtml,
    companyName: params.companyName,
    companyEmail: params.companyEmail,
  });

  try {
    const { data, error } = await supabase.functions.invoke('send-report', {
      body: {
        type: 'statement_of_account',
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        subject: `Statement of Account - ${params.customerName} - ${params.statementDate}`,
        htmlContent,
        companyName: params.companyName,
        companyEmail: params.companyEmail,
        csvBase64: params.csvData ? btoa(params.csvData) : undefined,
        csvFilename: params.csvData ? `statement_${params.customerName.replace(/\s+/g, '_')}_${params.statementDate.replace(/\//g, '-')}.csv` : undefined,
      },
    });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error sending statement email:', error);
    return { success: false, error: error.message };
  }
};

export const sendReportEmail = async (params: {
  type: 'revenue_report' | 'outstanding_report' | 'job_status_report' | 'customer_analysis_report';
  recipientEmail: string;
  recipientName: string;
  reportTitle: string;
  summaryData: Record<string, string | number>;
  reportDate: string;
  companyName?: string;
  companyEmail?: string;
  csvData?: string;
}): Promise<{ success: boolean; error?: string }> => {
  const summaryRows = Object.entries(params.summaryData).map(([key, value]) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; color: #666;">${key}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: bold;">${value}</td>
    </tr>
  `).join('');

  const summaryHtml = `
    <h3 style="margin: 0 0 15px 0; color: #1e3a5f;">${params.reportTitle}</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tbody>
        ${summaryRows}
      </tbody>
    </table>
  `;

  const htmlContent = generateReportEmailHtml({
    type: params.type,
    recipientEmail: params.recipientEmail,
    recipientName: params.recipientName,
    subject: params.reportTitle,
    reportTitle: params.reportTitle,
    reportDate: params.reportDate,
    summaryHtml,
    companyName: params.companyName,
    companyEmail: params.companyEmail,
  });

  try {
    const { data, error } = await supabase.functions.invoke('send-report', {
      body: {
        type: params.type,
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        subject: `${params.reportTitle} - ${params.reportDate}`,
        htmlContent,
        companyName: params.companyName,
        companyEmail: params.companyEmail,
        csvBase64: params.csvData ? btoa(params.csvData) : undefined,
        csvFilename: params.csvData ? `${params.type}_${params.reportDate.replace(/\//g, '-')}.csv` : undefined,
      },
    });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error sending report email:', error);
    return { success: false, error: error.message };
  }
};
