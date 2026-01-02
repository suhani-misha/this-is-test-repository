import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceTemplate } from '@/hooks/useInvoiceTemplates';

interface InvoiceItem {
  description: string;
  quantity: number | null;
  unit_price: number;
  tax_rate: number | null;
  tax_amount: number | null;
  total: number;
}

interface Invoice {
  invoice_number: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number | null;
  total_amount: number;
  paid_amount: number | null;
  status: string | null;
  notes: string | null;
  customers?: {
    name: string;
    email: string | null;
    address?: string | null;
    phone?: string | null;
  };
  jobs?: {
    job_number: string;
  };
}

interface CompanyProfile {
  company_name: string | null;
  company_address: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_logo_url: string | null;
}

// Helper to convert hex to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ];
  }
  return [30, 58, 138]; // Default navy blue
}

export async function generateInvoicePDF(
  invoice: Invoice,
  items: InvoiceItem[],
  profile: CompanyProfile | null,
  template?: InvoiceTemplate | null,
  formatDate?: (date: Date | string | null | undefined) => string
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors from template or defaults
  const headerColor = template?.header_color || '#1e3a5f';
  const accentColor = template?.accent_color || '#f97316';
  
  const primaryColor = hexToRgb(headerColor);
  const textColor: [number, number, number] = [55, 65, 81];
  
  // Date formatting function
  const formatDateFn = formatDate || ((date: Date | string | null | undefined) => {
    if (!date) return '-';
    return new Date(date as string).toLocaleDateString();
  });
  
  let yPos = 20;
  
  // Company Header
  if (template?.show_company_details !== false) {
    doc.setFontSize(24);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(profile?.company_name || 'CargoClear', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'normal');
    
    if (profile?.company_address) {
      doc.text(profile.company_address, 20, yPos);
      yPos += 5;
    }
    if (profile?.company_phone) {
      doc.text(`Phone: ${profile.company_phone}`, 20, yPos);
      yPos += 5;
    }
    if (profile?.company_email) {
      doc.text(`Email: ${profile.company_email}`, 20, yPos);
      yPos += 5;
    }
  }
  
  // Invoice Title
  yPos = 20;
  doc.setFontSize(28);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - 20, yPos, { align: 'right' });
  
  // Invoice Details Box
  yPos += 10;
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice #: ${invoice.invoice_number}`, pageWidth - 20, yPos, { align: 'right' });
  yPos += 5;
  doc.text(`Issue Date: ${formatDateFn(invoice.issue_date)}`, pageWidth - 20, yPos, { align: 'right' });
  yPos += 5;
  doc.text(`Due Date: ${formatDateFn(invoice.due_date)}`, pageWidth - 20, yPos, { align: 'right' });
  
  if (invoice.jobs?.job_number) {
    yPos += 5;
    doc.text(`Job #: ${invoice.jobs.job_number}`, pageWidth - 20, yPos, { align: 'right' });
  }
  
  // Status Badge
  yPos += 8;
  const statusText = (invoice.status || 'draft').toUpperCase();
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  
  let statusColor: [number, number, number] = [107, 114, 128]; // gray
  if (invoice.status === 'paid') statusColor = [22, 163, 74]; // green
  else if (invoice.status === 'sent') statusColor = [59, 130, 246]; // blue
  else if (invoice.status === 'overdue') statusColor = [239, 68, 68]; // red
  else if (invoice.status === 'partially_paid') statusColor = [245, 158, 11]; // amber
  
  doc.setTextColor(...statusColor);
  doc.text(statusText, pageWidth - 20, yPos, { align: 'right' });
  
  // Bill To Section
  yPos = 70;
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 20, yPos);
  
  yPos += 7;
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.customers?.name || 'N/A', 20, yPos);
  
  if (invoice.customers?.address) {
    yPos += 5;
    doc.text(invoice.customers.address, 20, yPos);
  }
  if (invoice.customers?.email) {
    yPos += 5;
    doc.text(invoice.customers.email, 20, yPos);
  }
  if (invoice.customers?.phone) {
    yPos += 5;
    doc.text(invoice.customers.phone, 20, yPos);
  }
  
  // Line Items Table
  yPos += 15;
  
  const tableData = items.map(item => [
    item.description,
    item.quantity?.toString() || '1',
    `$${item.unit_price.toFixed(2)}`,
    item.tax_rate ? `${item.tax_rate}%` : '0%',
    `$${(item.tax_amount || 0).toFixed(2)}`,
    `$${item.total.toFixed(2)}`
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Qty', 'Unit Price', 'Tax Rate', 'Tax', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      textColor: textColor,
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' }
    },
    margin: { left: 20, right: 20 }
  });
  
  // Get the final Y position after the table
  const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
  
  // Totals Section
  const totalsX = pageWidth - 80;
  let totalsY = finalY + 15;
  
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Subtotal:', totalsX, totalsY);
  doc.text(`$${invoice.subtotal.toFixed(2)}`, pageWidth - 20, totalsY, { align: 'right' });
  
  totalsY += 6;
  doc.text('Tax:', totalsX, totalsY);
  doc.text(`$${(invoice.tax_amount || 0).toFixed(2)}`, pageWidth - 20, totalsY, { align: 'right' });
  
  totalsY += 8;
  doc.setDrawColor(...primaryColor);
  doc.line(totalsX - 5, totalsY - 3, pageWidth - 20, totalsY - 3);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Total:', totalsX, totalsY);
  doc.text(`$${invoice.total_amount.toFixed(2)}`, pageWidth - 20, totalsY, { align: 'right' });
  
  // Paid Amount
  if ((invoice.paid_amount || 0) > 0) {
    totalsY += 7;
    doc.setFontSize(10);
    doc.setTextColor(22, 163, 74);
    doc.setFont('helvetica', 'normal');
    doc.text('Paid:', totalsX, totalsY);
    doc.text(`-$${(invoice.paid_amount || 0).toFixed(2)}`, pageWidth - 20, totalsY, { align: 'right' });
    
    totalsY += 7;
    const balance = invoice.total_amount - (invoice.paid_amount || 0);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(balance > 0 ? 239 : 22, balance > 0 ? 68 : 163, balance > 0 ? 68 : 74);
    doc.text('Balance Due:', totalsX, totalsY);
    doc.text(`$${balance.toFixed(2)}`, pageWidth - 20, totalsY, { align: 'right' });
  }
  
  // Bank Details (from template)
  if (template?.bank_details) {
    totalsY += 15;
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Bank Details:', 20, totalsY);
    
    totalsY += 6;
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitBankDetails = doc.splitTextToSize(template.bank_details, pageWidth - 40);
    doc.text(splitBankDetails, 20, totalsY);
    totalsY += splitBankDetails.length * 4;
  }
  
  // Payment Terms (from template or default)
  const paymentTerms = template?.payment_terms_text || 'Payment is due within 30 days of invoice date. Please include invoice number with payment.';
  if (paymentTerms) {
    totalsY += 10;
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Terms:', 20, totalsY);
    
    totalsY += 6;
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitTerms = doc.splitTextToSize(paymentTerms, pageWidth - 40);
    doc.text(splitTerms, 20, totalsY);
    totalsY += splitTerms.length * 4;
  }
  
  // Notes Section
  if (invoice.notes) {
    totalsY += 10;
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 20, totalsY);
    
    totalsY += 6;
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitNotes = doc.splitTextToSize(invoice.notes, pageWidth - 40);
    doc.text(splitNotes, 20, totalsY);
  }
  
  // Additional Notes (from template)
  if (template?.additional_notes) {
    totalsY += 15;
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'italic');
    const splitAdditional = doc.splitTextToSize(template.additional_notes, pageWidth - 40);
    doc.text(splitAdditional, 20, totalsY);
  }
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  const footerText = template?.footer_text || 'Thank you for your business!';
  doc.setFontSize(8);
  const accentRgb = hexToRgb(accentColor);
  doc.setTextColor(...accentRgb);
  doc.setFont('helvetica', 'normal');
  doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });
  doc.setTextColor(156, 163, 175);
  doc.text(`Generated on ${formatDateFn(new Date())}`, pageWidth / 2, footerY + 5, { align: 'center' });
  
  // Save the PDF
  doc.save(`Invoice-${invoice.invoice_number}.pdf`);
}
