import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Download, FileText, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCustomers } from '@/hooks/useCustomers';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { format } from 'date-fns';
import { exportToCSV } from '@/lib/csvExport';
import { toast } from 'sonner';
import { sendStatementEmail } from '@/lib/reportEmailService';

interface Transaction {
  id: string;
  date: string;
  type: 'invoice' | 'payment';
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

const StatementOfAccount = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { customers, loading: customersLoading } = useCustomers();
  const { formatDate } = useDateFormat();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [profile, setProfile] = useState<{ company_name: string | null; company_email: string | null } | null>(null);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchTransactions();
    }
  }, [selectedCustomerId]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('company_name, company_email')
      .eq('id', user!.id)
      .maybeSingle();
    setProfile(data);
  };

  const fetchTransactions = async () => {
    if (!user || !selectedCustomerId) return;
    setLoading(true);

    try {
      // Fetch invoices - exclude void invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, issue_date, status, job_id')
        .eq('customer_id', selectedCustomerId)
        .neq('status', 'void')
        .order('issue_date', { ascending: true });

      // Fetch payments
      const { data: payments } = await supabase
        .from('payments')
        .select('id, reference_number, amount, payment_date, payment_method, invoice_id, invoices(invoice_number)')
        .eq('customer_id', selectedCustomerId)
        .order('payment_date', { ascending: true });

      // Combine all transactions
      const allTransactions: Transaction[] = [];

      // Add invoices as debits (amounts owed by customer)
      invoices?.forEach(invoice => {
        allTransactions.push({
          id: invoice.id,
          date: invoice.issue_date,
          type: 'invoice',
          reference: invoice.invoice_number,
          description: `Invoice - ${invoice.status?.toUpperCase() || 'DRAFT'}`,
          debit: invoice.total_amount,
          credit: 0,
          balance: 0
        });
      });

      // Add payments as credits (amounts paid by customer)
      payments?.forEach(payment => {
        const invoiceRef = payment.invoices?.invoice_number || 'Unknown';
        allTransactions.push({
          id: payment.id,
          date: payment.payment_date,
          type: 'payment',
          reference: payment.reference_number || `PAY-${payment.id.slice(0, 8)}`,
          description: `Payment via ${payment.payment_method} for ${invoiceRef}`,
          debit: 0,
          credit: payment.amount,
          balance: 0
        });
      });

      // Sort by date
      allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate running balance
      let runningBalance = 0;
      allTransactions.forEach(t => {
        runningBalance += t.debit - t.credit;
        t.balance = runningBalance;
      });

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const generateCSVData = () => {
    return transactions.map(t => 
      `"${formatDate(t.date)}","${t.type}","${t.reference}","${t.description}","${t.debit > 0 ? t.debit.toFixed(2) : ''}","${t.credit > 0 ? t.credit.toFixed(2) : ''}","${t.balance.toFixed(2)}"`
    ).join('\n');
  };

  const handleExportCSV = () => {
    if (!selectedCustomer || transactions.length === 0) return;
    
    const csvData = transactions.map(t => ({
      Date: formatDate(t.date),
      Type: t.type.charAt(0).toUpperCase() + t.type.slice(1),
      Reference: t.reference,
      Description: t.description,
      Debit: t.debit > 0 ? t.debit.toFixed(2) : '',
      Credit: t.credit > 0 ? t.credit.toFixed(2) : '',
      Balance: t.balance.toFixed(2)
    }));

    exportToCSV(csvData, `statement_${selectedCustomer.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}`);
    toast.success('Statement exported to CSV');
  };

  const handleEmailStatement = async () => {
    if (!selectedCustomer || transactions.length === 0) return;
    
    if (!selectedCustomer.email) {
      toast.error('Customer does not have an email address');
      return;
    }

    setIsSendingEmail(true);

    try {
      const csvHeader = 'Date,Type,Reference,Description,Debit,Credit,Balance\n';
      const csvContent = csvHeader + generateCSVData();

      const result = await sendStatementEmail({
        recipientEmail: selectedCustomer.email,
        recipientName: selectedCustomer.name,
        customerName: selectedCustomer.name,
        transactions: transactions.map(t => ({
          ...t,
          date: formatDate(t.date),
        })),
        totalDebit,
        totalCredit,
        closingBalance,
        statementDate: formatDate(new Date()),
        companyName: profile?.company_name || undefined,
        companyEmail: profile?.company_email || undefined,
        csvData: csvContent,
      });

      if (result.success) {
        toast.success(`Statement sent to ${selectedCustomer.email}`);
      } else {
        toast.error('Failed to send statement: ' + (result.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error sending statement:', error);
      toast.error('Failed to send statement');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'invoice':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Invoice</Badge>;
      case 'payment':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Payment</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
  const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);
  const closingBalance = totalDebit - totalCredit;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Statement of Account</h1>
            <p className="text-muted-foreground">View complete transaction history for a customer</p>
          </div>
        </div>
        {selectedCustomerId && transactions.length > 0 && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleEmailStatement}
              disabled={isSendingEmail || !selectedCustomer?.email}
            >
              {isSendingEmail ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Email to Customer
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Customer</CardTitle>
          <CardDescription>Choose a customer to view their statement of account</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
            <SelectTrigger className="w-full md:w-[400px]">
              <SelectValue placeholder="Select a customer..." />
            </SelectTrigger>
            <SelectContent>
              {customers.map(customer => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCustomer && (
        <>
          <Card className="print:shadow-none">
            <CardHeader className="print:pb-2">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {selectedCustomer.name}
                  </CardTitle>
                  <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
                    {selectedCustomer.email && <div>{selectedCustomer.email}</div>}
                    {selectedCustomer.phone && <div>{selectedCustomer.phone}</div>}
                    {selectedCustomer.address && <div>{selectedCustomer.address}</div>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Statement Date</p>
                  <p className="font-medium">{formatDate(new Date())}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found for this customer
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((transaction) => (
                          <TableRow key={`${transaction.type}-${transaction.id}`}>
                            <TableCell>{formatDate(transaction.date)}</TableCell>
                            <TableCell>{getTypeBadge(transaction.type)}</TableCell>
                            <TableCell className="font-mono text-sm">{transaction.reference}</TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell className="text-right">
                              {transaction.debit > 0 ? `$${transaction.debit.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {transaction.credit > 0 ? `$${transaction.credit.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${transaction.balance.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell colSpan={4} className="text-right">Totals</TableCell>
                          <TableCell className="text-right">${totalDebit.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-green-600">${totalCredit.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <span className={closingBalance > 0 ? 'text-destructive' : 'text-green-600'}>
                              ${closingBalance.toFixed(2)}
                            </span>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Card className="w-full md:w-80">
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Invoiced:</span>
                          <span className="font-medium">${totalDebit.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Paid:</span>
                          <span className="font-medium text-green-600">${totalCredit.toFixed(2)}</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between">
                          <span className="font-semibold">Balance Due:</span>
                          <span className={`font-bold ${closingBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                            ${closingBalance.toFixed(2)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default StatementOfAccount;