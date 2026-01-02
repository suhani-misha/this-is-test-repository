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
import { format } from 'date-fns';
import EmailReportDialog from '@/components/EmailReportDialog';

interface MonthlyRevenue {
  month: string;
  monthKey: string;
  revenue: number;
  invoices: number;
  paid: number;
  pending: number;
}

const RevenueReport = () => {
  const { user } = useAuth();
  const { formatDate } = useDateFormat();
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [loading, setLoading] = useState(true);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const fetchRevenueData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, issue_date, total_amount, paid_amount, status')
        .neq('status', 'void')
        .order('issue_date', { ascending: false });

      if (error) throw error;

      // Group by month
      const monthMap: Record<string, MonthlyRevenue> = {};

      invoices?.forEach(inv => {
        const date = new Date(inv.issue_date);
        const monthKey = format(date, 'yyyy-MM');
        const monthLabel = format(date, 'MMMM yyyy');

        if (!monthMap[monthKey]) {
          monthMap[monthKey] = {
            month: monthLabel,
            monthKey,
            revenue: 0,
            invoices: 0,
            paid: 0,
            pending: 0,
          };
        }

        monthMap[monthKey].revenue += inv.total_amount || 0;
        monthMap[monthKey].invoices += 1;
        monthMap[monthKey].paid += inv.paid_amount || 0;
        monthMap[monthKey].pending += (inv.total_amount || 0) - (inv.paid_amount || 0);
      });

      // Convert to array and sort by date
      const revenueData = Object.values(monthMap).sort((a, b) => 
        b.monthKey.localeCompare(a.monthKey)
      );

      setMonthlyRevenue(revenueData);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      toast.error('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueData();
  }, [user]);

  const filteredData = selectedMonth === 'all' 
    ? monthlyRevenue 
    : monthlyRevenue.filter(m => m.monthKey === selectedMonth);

  const totalRevenue = filteredData.reduce((sum, m) => sum + m.revenue, 0);
  const totalPaid = filteredData.reduce((sum, m) => sum + m.paid, 0);
  const totalPending = filteredData.reduce((sum, m) => sum + m.pending, 0);
  const totalInvoices = filteredData.reduce((sum, m) => sum + m.invoices, 0);

  const handlePrint = () => {
    window.print();
  };

  const generateCSVContent = () => {
    const header = 'Month,Total Revenue,Collected,Pending,Invoices,Collection Rate\n';
    const rows = filteredData.map(m => 
      `"${m.month}","${m.revenue.toFixed(2)}","${m.paid.toFixed(2)}","${m.pending.toFixed(2)}","${m.invoices}","${m.revenue > 0 ? ((m.paid / m.revenue) * 100).toFixed(1) : 0}%"`
    ).join('\n');
    return header + rows;
  };

  const handleExportCSV = () => {
    const exportData = filteredData.map(m => ({
      month: m.month,
      revenue: m.revenue.toFixed(2),
      collected: m.paid.toFixed(2),
      pending: m.pending.toFixed(2),
      invoices: m.invoices,
      collectionRate: m.revenue > 0 ? ((m.paid / m.revenue) * 100).toFixed(1) + '%' : '0%',
    }));
    
    exportToCSV(exportData, 'revenue_report', {
      month: 'Month',
      revenue: 'Total Revenue',
      collected: 'Collected',
      pending: 'Pending',
      invoices: 'Invoices',
      collectionRate: 'Collection Rate',
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
          <h1 className="text-3xl font-bold">Revenue Collection Report</h1>
          <p className="text-muted-foreground">Monthly revenue analysis and collection rates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchRevenueData} className="gap-2">
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
        reportType="revenue_report"
        reportTitle="Revenue Collection Report"
        summaryData={{
          'Total Revenue': `$${totalRevenue.toLocaleString()}`,
          'Collected': `$${totalPaid.toLocaleString()}`,
          'Pending': `$${totalPending.toLocaleString()}`,
          'Total Invoices': totalInvoices,
          'Collection Rate': `${totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : 0}%`,
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
              <Label htmlFor="month">Filter by Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {monthlyRevenue.map(m => (
                    <SelectItem key={m.monthKey} value={m.monthKey}>{m.month}</SelectItem>
                  ))}
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
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">${totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">${totalPending.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Table */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Month</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No revenue data available.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Collection %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((month) => (
                  <TableRow key={month.monthKey}>
                    <TableCell className="font-medium">{month.month}</TableCell>
                    <TableCell className="text-right">${month.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-success">${month.paid.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-warning">${month.pending.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{month.invoices}</TableCell>
                    <TableCell className="text-right font-medium">
                      {month.revenue > 0 ? ((month.paid / month.revenue) * 100).toFixed(1) : 0}%
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">${totalRevenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-success">${totalPaid.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-warning">${totalPending.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{totalInvoices}</TableCell>
                  <TableCell className="text-right">
                    {totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueReport;