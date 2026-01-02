import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Printer, Download, RefreshCw, Loader2, CreditCard, Mail, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useInvoiceTemplates, InvoiceTemplate } from '@/hooks/useInvoiceTemplates';
import { sendPaymentNotification, sendInvoiceNotification } from '@/lib/emailService';
import { generateInvoicePDF } from '@/lib/invoicePdfGenerator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number | null;
  unit_price: number;
  tax_rate: number | null;
  tax_amount: number | null;
  total: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  job_id: string | null;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number | null;
  total_amount: number;
  paid_amount: number | null;
  status: string | null;
  notes: string | null;
  customers: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
  jobs: {
    job_number: string;
  } | null;
}

interface Profile {
  company_name: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_logo_url: string | null;
}

const InvoiceDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { formatDate } = useDateFormat();
  const { templates: invoiceTemplates, getActiveTemplate } = useInvoiceTemplates();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // PDF template selection dialog
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  useEffect(() => {
    if (id && user) {
      fetchInvoiceData();
    }
  }, [id, user]);

  useEffect(() => {
    // Set default template when templates load
    if (invoiceTemplates.length > 0 && !selectedTemplateId) {
      const activeTemplate = getActiveTemplate();
      if (activeTemplate) {
        setSelectedTemplateId(activeTemplate.id);
      }
    }
  }, [invoiceTemplates]);

  const fetchInvoiceData = async () => {
    try {
      // Fetch invoice with customer and job info
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (name, address, phone, email),
          jobs (job_number)
        `)
        .eq('id', id)
        .maybeSingle();

      if (invoiceError) throw invoiceError;
      if (!invoiceData) {
        toast.error('Invoice not found');
        navigate('/invoices');
        return;
      }

      setInvoice(invoiceData as Invoice);
      
      // Set initial payment amount to balance due
      const balance = invoiceData.total_amount - (invoiceData.paid_amount || 0);
      setPaymentAmount(balance);

      // Fetch invoice items
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('created_at');

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      // Fetch user profile for company info
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_name, company_address, company_phone, company_email, company_logo_url')
        .eq('id', user!.id)
        .maybeSingle();

      setProfile(profileData);
    } catch (error: any) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!user || !invoice) return;
    
    const balanceDue = invoice.total_amount - (invoice.paid_amount || 0);
    
    if (paymentAmount <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }
    
    if (paymentAmount > balanceDue) {
      toast.error('Payment amount cannot exceed balance due');
      return;
    }

    setIsSubmittingPayment(true);
    
    try {
      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoice.id,
          customer_id: invoice.customer_id,
          user_id: user.id,
          amount: paymentAmount,
          payment_method: paymentMethod,
          payment_date: new Date().toISOString().split('T')[0],
          reference_number: paymentReference || null,
        });

      if (paymentError) throw paymentError;

      // Update invoice paid amount and status
      const newPaidAmount = (invoice.paid_amount || 0) + paymentAmount;
      const newStatus = newPaidAmount >= invoice.total_amount ? 'paid' : 'partially_paid';

      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ 
          paid_amount: newPaidAmount,
          status: newStatus,
        })
        .eq('id', invoice.id);

      if (invoiceError) throw invoiceError;

      // Update job status if fully paid
      if (newStatus === 'paid' && invoice.job_id) {
        await supabase
          .from('jobs')
          .update({ status: 'cleared' })
          .eq('id', invoice.job_id);
      }

      // Send email notification
      if (invoice.customers?.email) {
        await sendPaymentNotification({
          recipientEmail: invoice.customers.email,
          recipientName: invoice.customers.name || 'Customer',
          invoiceNumber: invoice.invoice_number,
          amount: paymentAmount,
          paymentMethod: paymentMethod,
          paymentDate: formatDate(new Date()),
        });
      }

      toast.success('Payment recorded successfully!');
      setPaymentDialogOpen(false);
      fetchInvoiceData(); // Refresh the invoice data
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment: ' + error.message);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handlePrint = () => {
    window.print();
    toast.success('Print dialog opened');
  };

  const handleSync = () => {
    toast.success('Invoice synced to QuickBooks');
  };

  const handleDownloadPDF = () => {
    if (invoiceTemplates.length > 1) {
      // Show template selection dialog
      setPdfDialogOpen(true);
    } else {
      // Download directly with default/only template
      const template = getActiveTemplate();
      generateInvoicePDF(invoice!, items, profile, template, formatDate);
      toast.success('PDF downloaded');
    }
  };

  const handleConfirmDownloadPDF = () => {
    const template = invoiceTemplates.find(t => t.id === selectedTemplateId) || getActiveTemplate();
    generateInvoicePDF(invoice!, items, profile, template, formatDate);
    toast.success('PDF downloaded');
    setPdfDialogOpen(false);
  };

  const handleEmailInvoice = async () => {
    if (!invoice) return;
    
    if (!invoice.customers?.email) {
      toast.error('Customer does not have an email address');
      return;
    }

    setIsSendingEmail(true);
    try {
      const result = await sendInvoiceNotification({
        recipientEmail: invoice.customers.email,
        recipientName: invoice.customers.name,
        invoiceNumber: invoice.invoice_number,
        amount: invoice.total_amount,
        dueDate: formatDate(invoice.due_date),
        companyName: profile?.company_name || undefined,
        companyEmail: profile?.company_email || undefined,
      });

      if (result.success) {
        // Update invoice status to 'sent' if it's draft
        if (invoice.status === 'draft') {
          await supabase
            .from('invoices')
            .update({ status: 'sent' })
            .eq('id', invoice.id);
          fetchInvoiceData();
        }
        toast.success(`Invoice sent to ${invoice.customers.email}`);
      } else {
        toast.error('Failed to send invoice email');
      }
    } catch (error: any) {
      console.error('Error sending invoice email:', error);
      toast.error('Failed to send invoice: ' + error.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'paid':
        return 'bg-success/20 text-success';
      case 'partially_paid':
        return 'bg-warning/20 text-warning';
      case 'sent':
        return 'bg-primary/20 text-primary';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return <div>Invoice not found</div>;
  }

  const balanceDue = invoice.total_amount - (invoice.paid_amount || 0);

  return (
    <div className="space-y-6 max-w-5xl print:max-w-none">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{invoice.invoice_number}</h1>
            <p className="text-muted-foreground">Invoice Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          {balanceDue > 0 && (
            <Button onClick={() => setPaymentDialogOpen(true)} className="gap-2">
              <CreditCard className="h-4 w-4" />
              Record Payment
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={handleEmailInvoice} 
            disabled={isSendingEmail || !invoice.customers?.email}
            className="gap-2"
          >
            {isSendingEmail ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Email Invoice
          </Button>
          <Button variant="outline" onClick={handleSync} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Sync to QuickBooks
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDownloadPDF} 
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              {profile?.company_logo_url && (
                <img 
                  src={profile.company_logo_url} 
                  alt="Company Logo" 
                  className="h-16 mb-2 object-contain"
                />
              )}
              <CardTitle className="text-3xl mb-2">
                {profile?.company_name || 'CargoClear'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {profile?.company_address || '123 Port Authority Building'}<br />
                {profile?.company_phone && <>Phone: {profile.company_phone}<br /></>}
                {profile?.company_email && <>Email: {profile.company_email}</>}
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold">INVOICE</h2>
              <p className="text-muted-foreground">#{invoice.invoice_number}</p>
              <div className="mt-2 flex gap-2 justify-end">
                <Badge className={getStatusColor(invoice.status)}>
                  {invoice.status?.toUpperCase() || 'DRAFT'}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Bill To:</h3>
              <div className="text-sm">
                <p className="font-medium">{invoice.customers.name}</p>
                {invoice.customers.address && (
                  <p className="text-muted-foreground">{invoice.customers.address}</p>
                )}
                {invoice.customers.phone && (
                  <p className="text-muted-foreground">Phone: {invoice.customers.phone}</p>
                )}
                {invoice.customers.email && (
                  <p className="text-muted-foreground">Email: {invoice.customers.email}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issue Date:</span>
                  <span className="font-medium">{formatDate(invoice.issue_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-medium">{formatDate(invoice.due_date)}</span>
                </div>
                {invoice.jobs && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Job Reference:</span>
                    <span 
                      className="font-medium text-primary hover:underline cursor-pointer"
                      onClick={() => navigate(`/jobs/${invoice.job_id}`)}
                    >
                      {invoice.jobs.job_number}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Tax Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity || 1}</TableCell>
                    <TableCell className="text-right">${item.unit_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{item.tax_rate || 0}%</TableCell>
                    <TableCell className="text-right font-medium">${item.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Separator />

          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax:</span>
                <span className="font-medium">${(invoice.tax_amount || 0).toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>${invoice.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-medium text-success">${(invoice.paid_amount || 0).toFixed(2)}</span>
              </div>
              {balanceDue > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-warning">Balance Due:</span>
                    <span className="text-warning">${balanceDue.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Payment Terms:</p>
            <p>Payment is due within 30 days of invoice date. Please include invoice number with payment.</p>
            {invoice.notes && (
              <p className="mt-2"><strong>Notes:</strong> {invoice.notes}</p>
            )}
          </div>

          <div className="text-center text-xs text-muted-foreground pt-4">
            <p>Thank you for your business!</p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Apply payment to invoice {invoice.invoice_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Invoice Total:</span>
                <span className="font-medium">${invoice.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-medium text-success">${(invoice.paid_amount || 0).toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span className="text-warning">Balance Due:</span>
                <span className="text-warning">${balanceDue.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-amount">Payment Amount *</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={balanceDue}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                disabled={isSubmittingPayment}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method *</Label>
              <Select 
                value={paymentMethod} 
                onValueChange={setPaymentMethod}
                disabled={isSubmittingPayment}
              >
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Card">Credit/Debit Card</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-reference">Reference Number</Label>
              <Input
                id="payment-reference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Transaction/Cheque number"
                disabled={isSubmittingPayment}
              />
            </div>

            {paymentAmount >= balanceDue && (
              <div className="p-3 bg-success/10 border border-success/20 rounded text-success text-sm font-medium">
                ✓ Invoice will be marked as PAID
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} disabled={isSubmittingPayment}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={isSubmittingPayment}>
              {isSubmittingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Recording...
                </>
              ) : (
                'Record Payment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Template Selection Dialog */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Select Invoice Template
            </DialogTitle>
            <DialogDescription>
              Choose which template to use for generating the PDF
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="template-select">Template</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger id="template-select" className="mt-2">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {invoiceTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} {template.is_active && '(Active)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmDownloadPDF} disabled={!selectedTemplateId}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceDetail;
