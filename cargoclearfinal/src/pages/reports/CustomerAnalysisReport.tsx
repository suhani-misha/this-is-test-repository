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

interface CustomerAnalysisData {
  customerId: string;
  customer: string;
  totalJobs: number;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  avgJobValue: number;
}

const CustomerAnalysisReport = () => {
  const { user } = useAuth();
  const { formatDate } = useDateFormat();
  const [sortBy, setSortBy] = useState('revenue');
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState<CustomerAnalysisData[]>([]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const fetchCustomerAnalysis = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch customers
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name');

      // Fetch jobs with customer data
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, customer_id, total_amount');

      // Fetch invoices with payment info
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, customer_id, total_amount, paid_amount, status')
        .neq('status', 'void');

      // Build customer analysis
      const analysisMap: Record<string, CustomerAnalysisData> = {};

      customers?.forEach(customer => {
        analysisMap[customer.id] = {
          customerId: customer.id,
          customer: customer.name,
          totalJobs: 0,
          totalBilled: 0,
          totalPaid: 0,
          outstanding: 0,
          avgJobValue: 0,
        };
      });

      // Count jobs and sum job amounts per customer
      jobs?.forEach(job => {
        if (analysisMap[job.customer_id]) {
          analysisMap[job.customer_id].totalJobs += 1;
        }
      });

      // Sum invoice amounts per customer
      invoices?.forEach(inv => {
        if (analysisMap[inv.customer_id]) {
          analysisMap[inv.customer_id].totalBilled += inv.total_amount || 0;
          analysisMap[inv.customer_id].totalPaid += inv.paid_amount || 0;
          analysisMap[inv.customer_id].outstanding += (inv.total_amount || 0) - (inv.paid_amount || 0);
        }
      });

      // Calculate average job value
      Object.values(analysisMap).forEach(data => {
        data.avgJobValue = data.totalJobs > 0 ? data.totalBilled / data.totalJobs : 0;
      });

      // Filter out customers with no activity
      const activeCustomers = Object.values(analysisMap).filter(
        c => c.totalJobs > 0 || c.totalBilled > 0
      );

      setCustomerData(activeCustomers);
    } catch (error) {
      console.error('Error fetching customer analysis:', error);
      toast.error('Failed to load customer analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerAnalysis();
  }, [user]);

  const sortedData = [...customerData].sort((a, b) => {
    switch (sortBy) {
      case 'revenue':
        return b.totalBilled - a.totalBilled;
      case 'jobs':
        return b.totalJobs - a.totalJobs;
      case 'outstanding':
        return b.outstanding - a.outstanding;
      case 'payment_rate':
        const rateA = a.totalBilled > 0 ? a.totalPaid / a.totalBilled : 0;
        const rateB = b.totalBilled > 0 ? b.totalPaid / b.totalBilled : 0;
        return rateB - rateA;
      default:
        return 0;
    }
  });

  const totals = {
    jobs: sortedData.reduce((sum, c) => sum + c.totalJobs, 0),
    billed: sortedData.reduce((sum, c) => sum + c.totalBilled, 0),
    paid: sortedData.reduce((sum, c) => sum + c.totalPaid, 0),
    outstanding: sortedData.reduce((sum, c) => sum + c.outstanding, 0),
  };

  const handlePrint = () => {
    window.print();
  };

  const generateCSVContent = () => {
    const header = 'Customer,Total Jobs,Total Billed,Total Paid,Outstanding,Avg Job Value,Payment Rate,Rating\n';
    const rows = sortedData.map(c => {
      const paymentRate = c.totalBilled > 0 ? (c.totalPaid / c.totalBilled) * 100 : 0;
      const rating = paymentRate >= 90 ? 'Excellent' : paymentRate >= 75 ? 'Good' : paymentRate >= 50 ? 'Fair' : 'Poor';
      return `"${c.customer}","${c.totalJobs}","${c.totalBilled.toFixed(2)}","${c.totalPaid.toFixed(2)}","${c.outstanding.toFixed(2)}","${c.avgJobValue.toFixed(2)}","${paymentRate.toFixed(1)}%","${rating}"`;
    }).join('\n');
    return header + rows;
  };

  const handleExportCSV = () => {
    const exportData = sortedData.map(c => {
      const paymentRate = c.totalBilled > 0 ? (c.totalPaid / c.totalBilled) * 100 : 0;
      const rating = paymentRate >= 90 ? 'Excellent' : paymentRate >= 75 ? 'Good' : paymentRate >= 50 ? 'Fair' : 'Poor';
      return {
        customer: c.customer,
        totalJobs: c.totalJobs,
        totalBilled: c.totalBilled.toFixed(2),
        totalPaid: c.totalPaid.toFixed(2),
        outstanding: c.outstanding.toFixed(2),
        avgJobValue: c.avgJobValue.toFixed(2),
        paymentRate: paymentRate.toFixed(1) + '%',
        rating,
      };
    });
    
    exportToCSV(exportData, 'customer_analysis_report', {
      customer: 'Customer',
      totalJobs: 'Total Jobs',
      totalBilled: 'Total Billed',
      totalPaid: 'Total Paid',
      outstanding: 'Outstanding',
      avgJobValue: 'Avg Job Value',
      paymentRate: 'Payment Rate',
      rating: 'Rating',
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
          <h1 className="text-3xl font-bold">Customer Analysis Report</h1>
          <p className="text-muted-foreground">Customer performance and payment behavior analysis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCustomerAnalysis} className="gap-2">
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
        reportType="customer_analysis_report"
        reportTitle="Customer Analysis Report"
        summaryData={{
          'Total Customers': sortedData.length,
          'Total Jobs': totals.jobs,
          'Total Billed': `$${totals.billed.toLocaleString()}`,
          'Total Paid': `$${totals.paid.toLocaleString()}`,
          'Total Outstanding': `$${totals.outstanding.toLocaleString()}`,
          'Avg Payment Rate': `${totals.billed > 0 ? ((totals.paid / totals.billed) * 100).toFixed(1) : 0}%`,
        }}
        reportDate={formatDate(new Date())}
        csvData={generateCSVContent()}
      />

      {/* Filters */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Sort & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sortBy">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sortBy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Total Revenue (Highest)</SelectItem>
                  <SelectItem value="jobs">Number of Jobs (Most)</SelectItem>
                  <SelectItem value="outstanding">Outstanding Balance (Highest)</SelectItem>
                  <SelectItem value="payment_rate">Payment Rate (Best)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 print:mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{sortedData.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totals.jobs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${totals.billed.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Payment Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {totals.billed > 0 ? ((totals.paid / totals.billed) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No customer data available.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Jobs</TableHead>
                  <TableHead className="text-right">Total Billed</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Avg Job Value</TableHead>
                  <TableHead className="text-right">Payment Rate</TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((customer) => {
                  const paymentRate = customer.totalBilled > 0 
                    ? (customer.totalPaid / customer.totalBilled) * 100 
                    : 0;
                  const rating = paymentRate >= 90 ? 'Excellent' : paymentRate >= 75 ? 'Good' : paymentRate >= 50 ? 'Fair' : 'Poor';
                  const ratingColor = paymentRate >= 90 ? 'text-success' : paymentRate >= 75 ? 'text-primary' : paymentRate >= 50 ? 'text-warning' : 'text-destructive';
                  
                  return (
                    <TableRow key={customer.customerId}>
                      <TableCell className="font-medium">{customer.customer}</TableCell>
                      <TableCell className="text-right">{customer.totalJobs}</TableCell>
                      <TableCell className="text-right">${customer.totalBilled.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-success">${customer.totalPaid.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-warning">${customer.outstanding.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${customer.avgJobValue.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">{paymentRate.toFixed(1)}%</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${ratingColor}`}>
                          {rating}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{totals.jobs}</TableCell>
                  <TableCell className="text-right">${totals.billed.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-success">${totals.paid.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-warning">${totals.outstanding.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    ${totals.jobs > 0 ? (totals.billed / totals.jobs).toFixed(2) : '0.00'}
                  </TableCell>
                  <TableCell className="text-right">
                    {totals.billed > 0 ? ((totals.paid / totals.billed) * 100).toFixed(1) : 0}%
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerAnalysisReport;