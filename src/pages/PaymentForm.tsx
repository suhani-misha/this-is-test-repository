import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useInvoices, Invoice } from '@/hooks/useInvoices';
import { sendPaymentNotification } from '@/lib/emailService';

const PaymentForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatDate } = useDateFormat();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [searchInvoice, setSearchInvoice] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<string>('');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    method: 'Bank Transfer',
    reference: '',
    notes: '',
  });

  const invoice = invoices.find(inv => inv.id === selectedInvoice);
  const remainingBalance = invoice ? invoice.total_amount - (invoice.paid_amount || 0) : 0;

  const handleInvoiceSearch = () => {
    const found = invoices.find(inv => 
      inv.invoice_number.toLowerCase().includes(searchInvoice.toLowerCase())
    );
    if (found) {
      setSelectedInvoice(found.id);
      setFormData({ ...formData, amount: found.total_amount - (found.paid_amount || 0) });
      toast.success(`Invoice ${found.invoice_number} found`);
    } else {
      toast.error('Invoice not found');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    if (!selectedInvoice || !invoice) {
      toast.error('Please select an invoice');
      return;
    }

    if (formData.amount <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }

    if (formData.amount > remainingBalance) {
      toast.error('Payment amount cannot exceed remaining balance');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoice.id,
          customer_id: invoice.customer_id,
          user_id: user.id,
          amount: formData.amount,
          payment_method: formData.method,
          payment_date: formData.date,
          reference_number: formData.reference || null,
          notes: formData.notes || null,
        });

      if (paymentError) throw paymentError;

      // Update invoice paid amount and status
      const newPaidAmount = (invoice.paid_amount || 0) + formData.amount;
      const newStatus = newPaidAmount >= invoice.total_amount ? 'paid' : 'partially_paid';
      const newBalance = invoice.total_amount - newPaidAmount;

      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ 
          paid_amount: newPaidAmount,
          status: newStatus,
        })
        .eq('id', invoice.id);

      if (invoiceError) throw invoiceError;

      // Update customer balance
      await supabase
        .from('customers')
        .update({ 
          current_balance: newBalance > 0 ? newBalance : 0,
        })
        .eq('id', invoice.customer_id);

      // Send email notification if customer has email
      if (invoice.customers?.email) {
        await sendPaymentNotification({
          recipientEmail: invoice.customers.email,
          recipientName: invoice.customers.name || 'Customer',
          invoiceNumber: invoice.invoice_number,
          amount: formData.amount,
          paymentMethod: formData.method,
          paymentDate: formatDate(new Date(formData.date)),
        });
        toast.success('Payment recorded and confirmation email sent!');
      } else {
        toast.success('Payment recorded successfully!');
      }

      navigate('/payments');
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (invoicesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const unpaidInvoices = invoices.filter(inv => (inv.total_amount - (inv.paid_amount || 0)) > 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/payments')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Record Payment</h1>
          <p className="text-muted-foreground">Apply payment to an invoice</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Invoice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Enter invoice number (e.g., INV-2024-001)"
                value={searchInvoice}
                onChange={(e) => setSearchInvoice(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleInvoiceSearch()}
              />
            </div>
            <Button onClick={handleInvoiceSearch} className="gap-2">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoice">Or Select Invoice</Label>
            <Select value={selectedInvoice} onValueChange={(value) => {
              setSelectedInvoice(value);
              const inv = invoices.find(i => i.id === value);
              if (inv) setFormData({ ...formData, amount: inv.total_amount - (inv.paid_amount || 0) });
            }}>
              <SelectTrigger id="invoice">
                <SelectValue placeholder="Select an invoice" />
              </SelectTrigger>
              <SelectContent>
                {unpaidInvoices.map(inv => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.invoice_number} - {inv.customers?.name} - Balance: ${(inv.total_amount - (inv.paid_amount || 0)).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {invoice && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-semibold">{invoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-semibold">{invoice.customers?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-semibold">${invoice.total_amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount Paid</p>
                  <p className="font-semibold text-success">${(invoice.paid_amount || 0).toFixed(2)}</p>
                </div>
                {invoice.jobs && (
                  <div>
                    <p className="text-sm text-muted-foreground">Job Reference</p>
                    <p className="font-semibold">{invoice.jobs.job_number}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Balance Due</p>
                  <p className="font-bold text-warning text-lg">${remainingBalance.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedInvoice && (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Payment Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Payment Amount (USD) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={remainingBalance}
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    required
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum: ${remainingBalance.toFixed(2)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method">Payment Method *</Label>
                  <Select 
                    value={formData.method} 
                    onValueChange={(value) => setFormData({ ...formData, method: value })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="method">
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
                  <Label htmlFor="reference">Reference Number</Label>
                  <Input
                    id="reference"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="Transaction/Cheque number"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional payment notes"
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-primary/5 border-l-4 border-primary rounded">
                <div>
                  <p className="text-sm text-muted-foreground">New Balance After Payment</p>
                  <p className="text-2xl font-bold">
                    ${Math.max(0, remainingBalance - formData.amount).toFixed(2)}
                  </p>
                </div>
                {formData.amount >= remainingBalance && (
                  <div className="text-right">
                    <p className="text-success font-semibold">✓ Invoice will be marked as PAID</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="gap-2" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Record Payment
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/payments')} disabled={isSubmitting}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
};

export default PaymentForm;
