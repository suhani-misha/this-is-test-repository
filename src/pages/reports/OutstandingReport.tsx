import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Printer, Loader2, RefreshCw, Mail } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportToCSV } from '@/lib/csvExport';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import EmailReportDialog from '@/components/EmailReportDialog';

interface OutstandingInvoice {
  id: string;
  customer: string;
  customerId: string;
  invoice: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  outstanding: number;
  daysOverdue: number;
}

const OutstandingReport = () => {
  const { user } = useAuth();
  const { formatDate } = useDateFormat();
  const [ageFilter, setAgeFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [outstandingData, setOutstandingData] = useState<OutstandingInvoice[]>([]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const fetchOutstandingInvoices = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          issue_date,
          due_date,
          total_amount,
          paid_amount,
          status,
          customers (id, name)
        `)
        .neq('status', 'paid')
        .neq('status', 'void')
        .order('due_date', { ascending: true });

      if (error) throw error;

      const today = new Date();
      const processed: OutstandingInvoice[] = (invoices || []).map(inv => {
        const dueDate = new Date(inv.due_date);
        const diffTime = today.getTime() - dueDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const outstanding = inv.total_amount - (inv.paid_amount || 0);

        return {
          id: inv.id,
          customer: inv.customers?.name || 'Unknown',
          customerId: inv.customers?.id || '',
          invoice: inv.invoice_number,
          issueDate: inv.issue_date,
          dueDate: inv.due_date,
          totalAmount: inv.total_amount,
          paidAmount: inv.paid_amount || 0,
          outstanding,
          daysOverdue: diffDays > 0 ? diffDays : 0,
        };
      }).filter(inv => inv.outstanding > 0);

      setOutstandingData(processed);
    } catch (error: any) {
      console.error('Error fetching outstanding invoices:', error);
      toast.error('Failed to load outstanding invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutstandingInvoices();
  }, [user]);

  const customers = Array.from(new Set(outstandingData.map(p => p.customer)));

  const filteredData = outstandingData.filter(payment => {
    const ageMatch = ageFilter === 'all' ||
      (ageFilter === 'current' && payment.daysOverdue === 0) ||
      (ageFilter === '1-30' && payment.daysOverdue > 0 && payment.daysOverdue <= 30) ||
      (ageFilter === '31-60' && payment.daysOverdue > 30 && payment.daysOverdue <= 60) ||
      (ageFilter === '60+' && payment.daysOverdue > 60);
    
    const customerMatch = customerFilter === 'all' || payment.customer === customerFilter;
    
    return ageMatch && customerMatch;
  });

  const totalOutstanding = filteredData.reduce((sum, p) => sum + p.outstanding, 0);
  const overdueCount = filteredData.filter(p => p.daysOverdue > 0).length;
  const overdueAmount = filteredData.filter(p => p.daysOverdue > 0).reduce((sum, p) => sum + p.outstanding, 0);

  // Calculate aging buckets
  const currentAmount = filteredData.filter(p => p.daysOverdue === 0).reduce((sum, p) => sum + p.outstanding, 0);
  const bucket1_30 = filteredData.filter(p => p.daysOverdue > 0 && p.daysOverdue <= 30).reduce((sum, p) => sum + p.outstanding, 0);
  const bucket31_60 = filteredData.filter(p => p.daysOverdue > 30 && p.daysOverdue <= 60).reduce((sum, p) => sum + p.outstanding, 0);
  const bucket60Plus = filteredData.filter(p => p.daysOverdue > 60).reduce((sum, p) => sum + p.outstanding, 0);

  const handlePrint = () => {
    window.print();
  };

  const generateCSVContent = () => {
    const header = 'Customer,Invoice,Issue Date,Due Date,Total Amount,Paid Amount,Outstanding Amount,Days Overdue,Status\n';
    const rows = filteredData.map(p => 
      `"${p.customer}","${p.invoice}","${formatDate(p.issueDate)}","${formatDate(p.dueDate)}","${p.totalAmount.toFixed(2)}","${p.paidAmount.toFixed(2)}","${p.outstanding.toFixed(2)}","${p.daysOverdue}","${p.daysOverdue === 0 ? 'Current' : p.daysOverdue <= 30 ? '1-30 Days' : p.daysOverdue <= 60 ? '31-60 Days' : '60+ Days'}"`
    ).join('\n');
    return header + rows;
  };

  const handleExportCSV = () => {
    const exportData = filteredData.map(p => ({
      customer: p.customer,
      invoice: p.invoice,
      issueDate: formatDate(p.issueDate),
      dueDate: formatDate(p.dueDate),
      totalAmount: p.totalAmount.toFixed(2),
      paidAmount: p.paidAmount.toFixed(2),
      outstanding: p.outstanding.toFixed(2),
      daysOverdue: p.daysOverdue,
      status: p.daysOverdue === 0 ? 'Current' : p.daysOverdue <= 30 ? '1-30 Days' : p.daysOverdue <= 60 ? '31-60 Days' : '60+ Days',
    }));
    
    exportToCSV(exportData, 'outstanding_payments_report', {
      customer: 'Customer',
      invoice: 'Invoice',
      issueDate: 'Issue Date',
      dueDate: 'Due Date',
      totalAmount: 'Total Amount',
      paidAmount: 'Paid Amount',
      outstanding: 'Outstanding Amount',
      daysOverdue: 'Days Overdue',
      status: 'Status',
    });
    toast.success('CSV exported successfully');
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
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-3xl font-bold">Outstanding Payments Report</h1>
          <p className="text-muted-foreground">Aging analysis and pending customer payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchOutstandingInvoices} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setEmailDialogOpen(true)} className="gap-2">
            <Mail className="h-4 w-4" />
            Email
          </Button>
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <EmailReportDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        reportType="outstanding_report"
        reportTitle="Outstanding Payments Report"
        summaryData={{
          'Total Outstanding': `$${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          'Current': `$${currentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          '1-30 Days Overdue': `$${bucket1_30.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          '31-60 Days Overdue': `$${bucket31_60.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          '60+ Days Overdue': `$${bucket60Plus.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          'Total Invoices': filteredData.length,
        }}
        reportDate={formatDate(new Date())}
        csvData={generateCSVContent()}
      />

      {/* Filters */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Age Category</Label>
              <Select value={ageFilter} onValueChange={setAgeFilter}>
                <SelectTrigger id="age">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ages</SelectItem>
                  <SelectItem value="current">Current (Not Overdue)</SelectItem>
                  <SelectItem value="1-30">1-30 Days Overdue</SelectItem>
                  <SelectItem value="31-60">31-60 Days Overdue</SelectItem>
                  <SelectItem value="60+">60+ Days Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger id="customer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map(customer => (
                    <SelectItem key={customer} value={customer}>{customer}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aging Summary */}
      <Card className="print:mb-6">
        <CardHeader>
          <CardTitle>Aging Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Outstanding</p>
              <p className="text-2xl font-bold">${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-4 rounded-lg bg-success/10 text-center">
              <p className="text-sm text-muted-foreground mb-1">Current</p>
              <p className="text-2xl font-bold text-success">${currentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-4 rounded-lg bg-warning/10 text-center">
              <p className="text-sm text-muted-foreground mb-1">1-30 Days</p>
              <p className="text-2xl font-bold text-warning">${bucket1_30.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-4 rounded-lg bg-destructive/10 text-center">
              <p className="text-sm text-muted-foreground mb-1">31-60 Days</p>
              <p className="text-2xl font-bold text-destructive">${bucket31_60.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-4 rounded-lg bg-destructive/20 text-center">
              <p className="text-sm text-muted-foreground mb-1">60+ Days</p>
              <p className="text-2xl font-bold text-destructive">${bucket60Plus.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Table */}
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Invoices ({filteredData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No outstanding invoices found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Days Overdue</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.customer}</TableCell>
                    <TableCell>{payment.invoice}</TableCell>
                    <TableCell>{formatDate(payment.issueDate)}</TableCell>
                    <TableCell>{formatDate(payment.dueDate)}</TableCell>
                    <TableCell className="text-right">${payment.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-success">${payment.paidAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold text-warning">
                      ${payment.outstanding.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {payment.daysOverdue > 0 ? (
                        <span className="text-destructive font-bold">{payment.daysOverdue}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {payment.daysOverdue === 0 ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-success/20 text-success">Current</span>
                      ) : payment.daysOverdue <= 30 ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-warning/20 text-warning">1-30 Days</span>
                      ) : payment.daysOverdue <= 60 ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-destructive/30 text-destructive">31-60 Days</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-destructive/50 text-destructive font-bold">60+ Days</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={6}>Total</TableCell>
                  <TableCell className="text-right text-warning">
                    ${totalOutstanding.toFixed(2)}
                  </TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OutstandingReport;
