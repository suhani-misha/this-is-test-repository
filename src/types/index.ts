export type UserRole = 'ADMIN' | 'OPERATIONS' | 'ACCOUNTS' | 'VIEWER';

export type CustomerType = 'Individual' | 'Company';

export interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  type: CustomerType;
  notes: string;
  isActive: boolean;
  quickbooksCustomerId?: string;
  createdAt: string;
}

export interface Fee {
  id: string;
  name: string;
  category: string;
  defaultRate: number;
  taxRate: number;
  isTaxable: boolean;
  isActive: boolean;
  quickbooksItemId?: string;
}

export type JobStatus = 'OPEN' | 'INVOICED' | 'PARTIALLY_PAID' | 'CLEARED' | 'CANCELLED';

export interface JobCharge {
  id: string;
  feeId: string;
  feeName: string;
  descriptionOverride?: string;
  amount: number;
  taxAmount: number;
  total: number;
}

export interface Job {
  id: string;
  jobId: string;
  dateOfReport: string;
  rotationNo: string;
  shipperId: string;
  consigneeId: string;
  shipperAddress: string;
  consigneeAddress: string;
  consigneeTel: string;
  blNoAndType: string;
  equipQtyAndType: string;
  containerNo: string;
  sealNo: string;
  qtyAndPkgsDesc: string;
  cargoDescription: string;
  grossWeight: string;
  measurement: string;
  status: JobStatus;
  charges: JobCharge[];
  createdAt: string;
}

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'VOID';

export interface InvoiceLine {
  id: string;
  feeId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  invoiceId: string;
  jobId: string;
  customerId: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  total: number;
  taxTotal: number;
  amountPaid: number;
  balance: number;
  status: InvoiceStatus;
  quickbooksInvoiceId?: string;
  quickbooksSyncStatus: 'NOT_SYNCED' | 'SYNCED' | 'ERROR';
  lines: InvoiceLine[];
}

export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Card' | 'Cheque';

export interface Payment {
  id: string;
  paymentId: string;
  invoiceId: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  notes: string;
  quickbooksPaymentId?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
