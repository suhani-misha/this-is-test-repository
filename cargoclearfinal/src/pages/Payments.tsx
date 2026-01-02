import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Loader2, Download } from 'lucide-react';
import { exportToCSV, formatDateForCSV, formatCurrencyForCSV } from '@/lib/csvExport';
import { usePayments } from '@/hooks/usePayments';
import { useNavigate } from 'react-router-dom';
import { useDateFormat } from '@/hooks/useDateFormat';

const Payments = () => {
  const navigate = useNavigate();
  const { payments, loading } = usePayments();
  const { formatDate } = useDateFormat();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Record and manage payments</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              const data = payments.map(payment => ({
                invoice_number: payment.invoices?.invoice_number || '',
                customer: payment.customers?.name || '',
                payment_date: formatDateForCSV(payment.payment_date),
                amount: formatCurrencyForCSV(payment.amount),
                payment_method: payment.payment_method,
                reference_number: payment.reference_number || '',
                notes: payment.notes || '',
              }));
              exportToCSV(data, 'payments-export', {
                invoice_number: 'Invoice Number',
                customer: 'Customer',
                payment_date: 'Payment Date',
                amount: 'Amount',
                payment_method: 'Method',
                reference_number: 'Reference',
                notes: 'Notes',
              });
            }}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => navigate('/payments/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Record Payment
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payments recorded yet. Record your first payment from an invoice.
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold">{payment.invoices?.invoice_number || 'Unknown Invoice'}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <div>
                        <span className="text-muted-foreground">Customer: </span>
                        <span className="font-medium">{payment.customers?.name || 'Unknown'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Invoice: </span>
                        <span className="font-medium">{payment.invoices?.invoice_number}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date: </span>
                        <span className="font-medium">{formatDate(payment.payment_date)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Method: </span>
                        <span className="font-medium">{payment.payment_method}</span>
                      </div>
                      {payment.reference_number && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Reference: </span>
                          <span className="font-medium">{payment.reference_number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-success">${payment.amount.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Payments;
