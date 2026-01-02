import { Job, Invoice, InvoiceLine } from '@/types';

export function generateInvoiceFromJob(job: Job, customerId: string, customerName: string): Invoice {
  // Filter out zero-amount charges
  const validCharges = job.charges.filter(charge => charge.amount > 0);
  
  if (validCharges.length === 0) {
    throw new Error('No charges to invoice');
  }

  // Convert job charges to invoice lines
  const lines: InvoiceLine[] = validCharges.map((charge) => ({
    id: charge.id,
    feeId: charge.feeId,
    description: charge.descriptionOverride || charge.feeName,
    quantity: 1,
    unitPrice: charge.amount,
    taxRate: charge.taxAmount > 0 ? (charge.taxAmount / charge.amount) * 100 : 0,
    lineTotal: charge.total,
  }));

  // Calculate totals
  const total = validCharges.reduce((sum, charge) => sum + charge.total, 0);
  const taxTotal = validCharges.reduce((sum, charge) => sum + charge.taxAmount, 0);

  // Generate invoice ID
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(3, '0')}`;

  // Set dates
  const issueDate = new Date().toISOString().split('T')[0];
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days from now

  const invoice: Invoice = {
    id: String(Date.now()),
    invoiceId: invoiceNumber,
    jobId: job.jobId,
    customerId,
    customerName,
    issueDate,
    dueDate,
    currency: 'USD',
    total,
    taxTotal,
    amountPaid: 0,
    balance: total,
    status: 'DRAFT',
    quickbooksSyncStatus: 'NOT_SYNCED',
    lines,
  };

  return invoice;
}
