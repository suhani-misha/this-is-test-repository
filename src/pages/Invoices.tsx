import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Download } from 'lucide-react';
import { useInvoices } from '@/hooks/useInvoices';
import { Button } from '@/components/ui/button';
import { exportToCSV, formatDateForCSV, formatCurrencyForCSV } from '@/lib/csvExport';
import { useDateFormat } from '@/hooks/useDateFormat';

const Invoices = () => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { invoices, loading } = useInvoices();
  const { formatDate } = useDateFormat();

  const filteredInvoices = invoices.filter((invoice) =>
    invoice.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    (invoice.customers?.name?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'draft':
        return 'bg-muted text-muted-foreground';
      case 'sent':
        return 'bg-primary/20 text-primary';
      case 'partially_paid':
        return 'bg-warning/20 text-warning';
      case 'paid':
        return 'bg-success/20 text-success';
      case 'void':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

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
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">Manage customer invoices</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => {
            const data = filteredInvoices.map(invoice => ({
              invoice_number: invoice.invoice_number,
              customer: invoice.customers?.name || '',
              job_number: invoice.jobs?.job_number || '',
              status: invoice.status || 'draft',
              issue_date: formatDateForCSV(invoice.issue_date),
              due_date: formatDateForCSV(invoice.due_date),
              subtotal: formatCurrencyForCSV(invoice.subtotal),
              tax_amount: formatCurrencyForCSV(invoice.tax_amount || 0),
              total_amount: formatCurrencyForCSV(invoice.total_amount),
              paid_amount: formatCurrencyForCSV(invoice.paid_amount || 0),
              balance: formatCurrencyForCSV(invoice.total_amount - (invoice.paid_amount || 0)),
            }));
            exportToCSV(data, 'invoices-export', {
              invoice_number: 'Invoice Number',
              customer: 'Customer',
              job_number: 'Job Number',
              status: 'Status',
              issue_date: 'Issue Date',
              due_date: 'Due Date',
              subtotal: 'Subtotal',
              tax_amount: 'Tax',
              total_amount: 'Total',
              paid_amount: 'Paid',
              balance: 'Balance',
            });
          }}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {invoices.length === 0 
                ? 'No invoices yet. Generate an invoice from a job to get started.'
                : 'No invoices match your search.'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => {
                const balance = invoice.total_amount - (invoice.paid_amount || 0);
                
                return (
                  <div
                    key={invoice.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{invoice.invoice_number}</h3>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status?.replace('_', ' ') || 'draft'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">Customer: </span>
                          <span className="font-medium">{invoice.customers?.name || 'Unknown'}</span>
                        </div>
                        {invoice.jobs && (
                          <div>
                            <span className="text-muted-foreground">Job: </span>
                            <span className="font-medium">{invoice.jobs.job_number}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Issue Date: </span>
                          <span className="font-medium">{formatDate(invoice.issue_date)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Due Date: </span>
                          <span className="font-medium">{formatDate(invoice.due_date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-xl font-bold">${invoice.total_amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="text-sm font-semibold text-success">${(invoice.paid_amount || 0).toLocaleString()}</p>
                      </div>
                      {balance > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground">Balance</p>
                          <p className="text-sm font-semibold text-warning">${balance.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoices;
