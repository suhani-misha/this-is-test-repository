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

interface MonthlyJobData {
  month: string;
  monthKey: string;
  total: number;
  pending: number;
  in_progress: number;
  invoiced: number;
  partially_paid: number;
  cleared: number;
  cancelled: number;
}

const JobStatusReport = () => {
  const { user } = useAuth();
  const { formatDate } = useDateFormat();
  const [monthFilter, setMonthFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [jobsByMonth, setJobsByMonth] = useState<MonthlyJobData[]>([]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const fetchJobData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('id, status, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group jobs by month
      const monthMap: Record<string, MonthlyJobData> = {};

      jobs?.forEach(job => {
        const date = new Date(job.created_at);
        const monthKey = format(date, 'yyyy-MM');
        const monthLabel = format(date, 'MMMM yyyy');
        const status = job.status || 'pending';

        if (!monthMap[monthKey]) {
          monthMap[monthKey] = {
            month: monthLabel,
            monthKey,
            total: 0,
            pending: 0,
            in_progress: 0,
            invoiced: 0,
            partially_paid: 0,
            cleared: 0,
            cancelled: 0,
          };
        }

        monthMap[monthKey].total += 1;
        if (status in monthMap[monthKey]) {
          (monthMap[monthKey] as any)[status] += 1;
        }
      });

      // Convert to array and sort by date
      const monthlyData = Object.values(monthMap).sort((a, b) => 
        b.monthKey.localeCompare(a.monthKey)
      );

      setJobsByMonth(monthlyData);
    } catch (error) {
      console.error('Error fetching job data:', error);
      toast.error('Failed to load job data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobData();
  }, [user]);

  const filteredData = monthFilter === 'all' 
    ? jobsByMonth 
    : jobsByMonth.filter(m => m.monthKey === monthFilter);

  const totalJobs = filteredData.reduce((sum, m) => sum + m.total, 0);
  const totalPending = filteredData.reduce((sum, m) => sum + m.pending, 0);
  const totalInProgress = filteredData.reduce((sum, m) => sum + m.in_progress, 0);
  const totalInvoiced = filteredData.reduce((sum, m) => sum + m.invoiced, 0);
  const totalPartiallyPaid = filteredData.reduce((sum, m) => sum + m.partially_paid, 0);
  const totalCleared = filteredData.reduce((sum, m) => sum + m.cleared, 0);
  const totalCancelled = filteredData.reduce((sum, m) => sum + m.cancelled, 0);

  const handlePrint = () => {
    window.print();
  };

  const generateCSVContent = () => {
    const header = 'Month,Total Jobs,Pending,In Progress,Invoiced,Partially Paid,Cleared,Cancelled,Completion Rate\n';
    const rows = filteredData.map(m => 
      `"${m.month}","${m.total}","${m.pending}","${m.in_progress}","${m.invoiced}","${m.partially_paid}","${m.cleared}","${m.cancelled}","${m.total > 0 ? ((m.cleared / m.total) * 100).toFixed(1) : 0}%"`
    ).join('\n');
    return header + rows;
  };

  const handleExportCSV = () => {
    const exportData = filteredData.map(m => ({
      month: m.month,
      totalJobs: m.total,
      pending: m.pending,
      inProgress: m.in_progress,
      invoiced: m.invoiced,
      partiallyPaid: m.partially_paid,
      cleared: m.cleared,
      cancelled: m.cancelled,
      completionRate: m.total > 0 ? ((m.cleared / m.total) * 100).toFixed(1) + '%' : '0%',
    }));
    
    exportToCSV(exportData, 'job_status_report', {
      month: 'Month',
      totalJobs: 'Total Jobs',
      pending: 'Pending',
      inProgress: 'In Progress',
      invoiced: 'Invoiced',
      partiallyPaid: 'Partially Paid',
      cleared: 'Cleared',
      cancelled: 'Cancelled',
      completionRate: 'Completion Rate',
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
          <h1 className="text-3xl font-bold">Job Status Report</h1>
          <p className="text-muted-foreground">Job processing status and completion analysis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchJobData} className="gap-2">
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
        reportType="job_status_report"
        reportTitle="Job Status Report"
        summaryData={{
          'Total Jobs': totalJobs,
          'Pending': totalPending,
          'Invoiced': totalInvoiced,
          'Partially Paid': totalPartiallyPaid,
          'Cleared': totalCleared,
          'Cancelled': totalCancelled,
          'Completion Rate': `${totalJobs > 0 ? ((totalCleared / totalJobs) * 100).toFixed(1) : 0}%`,
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
              <Label htmlFor="month">Month</Label>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger id="month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {jobsByMonth.map(m => (
                    <SelectItem key={m.monthKey} value={m.monthKey}>{m.month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-6 print:mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalJobs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-accent">{totalPending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{totalInvoiced}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Partially Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-warning">{totalPartiallyPaid}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cleared</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">{totalCleared}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{totalCancelled}</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution Chart */}
      {totalJobs > 0 && (
        <Card className="print:mb-6">
          <CardHeader>
            <CardTitle>Job Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Pending</span>
                  <span className="text-sm text-muted-foreground">{totalPending} ({((totalPending/totalJobs)*100).toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div className="bg-accent h-3 rounded-full" style={{ width: `${(totalPending/totalJobs)*100}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Invoiced</span>
                  <span className="text-sm text-muted-foreground">{totalInvoiced} ({((totalInvoiced/totalJobs)*100).toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div className="bg-primary h-3 rounded-full" style={{ width: `${(totalInvoiced/totalJobs)*100}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Partially Paid</span>
                  <span className="text-sm text-muted-foreground">{totalPartiallyPaid} ({((totalPartiallyPaid/totalJobs)*100).toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div className="bg-warning h-3 rounded-full" style={{ width: `${(totalPartiallyPaid/totalJobs)*100}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Cleared</span>
                  <span className="text-sm text-muted-foreground">{totalCleared} ({((totalCleared/totalJobs)*100).toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div className="bg-success h-3 rounded-full" style={{ width: `${(totalCleared/totalJobs)*100}%` }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Table */}
      <Card>
        <CardHeader>
          <CardTitle>Jobs by Month</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No job data available.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Invoiced</TableHead>
                  <TableHead className="text-right">Part. Paid</TableHead>
                  <TableHead className="text-right">Cleared</TableHead>
                  <TableHead className="text-right">Completion %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((month) => (
                  <TableRow key={month.monthKey}>
                    <TableCell className="font-medium">{month.month}</TableCell>
                    <TableCell className="text-right font-bold">{month.total}</TableCell>
                    <TableCell className="text-right text-accent">{month.pending}</TableCell>
                    <TableCell className="text-right text-primary">{month.invoiced}</TableCell>
                    <TableCell className="text-right text-warning">{month.partially_paid}</TableCell>
                    <TableCell className="text-right text-success">{month.cleared}</TableCell>
                    <TableCell className="text-right font-medium">
                      {month.total > 0 ? ((month.cleared / month.total) * 100).toFixed(1) : 0}%
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{totalJobs}</TableCell>
                  <TableCell className="text-right text-accent">{totalPending}</TableCell>
                  <TableCell className="text-right text-primary">{totalInvoiced}</TableCell>
                  <TableCell className="text-right text-warning">{totalPartiallyPaid}</TableCell>
                  <TableCell className="text-right text-success">{totalCleared}</TableCell>
                  <TableCell className="text-right">
                    {totalJobs > 0 ? ((totalCleared / totalJobs) * 100).toFixed(1) : 0}%
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

export default JobStatusReport;