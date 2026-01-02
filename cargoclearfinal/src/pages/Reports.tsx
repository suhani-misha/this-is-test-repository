import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface MonthlyRevenue {
  month: string;
  revenue: number;
  invoices: number;
  paid: number;
}

interface OutstandingPayment {
  customer: string;
  invoice: string;
  issueDate: string;
  dueDate: string;
  outstanding: number;
  daysOverdue: number;
}

interface JobStatus {
  status: string;
  count: number;
  percentage: number;
}

interface CustomerAnalysis {
  customer: string;
  totalJobs: number;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

const Reports = () => {
  const { user } = useAuth();
  const { formatDate } = useDateFormat();
  const [loading, setLoading] = useState(true);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [outstandingPayments, setOutstandingPayments] = useState<OutstandingPayment[]>([]);
  const [jobsByStatus, setJobsByStatus] = useState<JobStatus[]>([]);
  const [customerAnalysis, setCustomerAnalysis] = useState<CustomerAnalysis[]>([]);

  useEffect(() => {
    if (user) {
      fetchReportData();
    }
  }, [user]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Fetch invoices with customer data
      const { data: invoices } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (name)
        `)
        .order('issue_date', { ascending: false });

      // Fetch jobs with customer data
      const { data: jobs } = await supabase
        .from('jobs')
        .select(`
          *,
          customers (name)
        `)
        .order('created_at', { ascending: false });

      // Fetch payments
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });

      // Calculate monthly revenue
      const revenueByMonth: Record<string, { revenue: number; invoices: number; paid: number }> = {};
      invoices?.forEach((inv) => {
        const month = new Date(inv.issue_date).toLocaleString('default', { month: 'long', year: 'numeric' });
        if (!revenueByMonth[month]) {
          revenueByMonth[month] = { revenue: 0, invoices: 0, paid: 0 };
        }
        revenueByMonth[month].revenue += inv.total_amount || 0;
        revenueByMonth[month].invoices += 1;
        revenueByMonth[month].paid += inv.paid_amount || 0;
      });

      const monthlyData = Object.entries(revenueByMonth).map(([month, data]) => ({
        month,
        ...data,
      }));
      setMonthlyRevenue(monthlyData);

      // Calculate outstanding payments
      const today = new Date();
      const outstanding: OutstandingPayment[] = invoices
        ?.filter((inv) => inv.status !== 'paid' && (inv.total_amount - (inv.paid_amount || 0)) > 0)
        .map((inv) => {
          const dueDate = new Date(inv.due_date);
          const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
          return {
            customer: inv.customers?.name || 'Unknown',
            invoice: inv.invoice_number,
            issueDate: inv.issue_date,
            dueDate: inv.due_date,
            outstanding: inv.total_amount - (inv.paid_amount || 0),
            daysOverdue,
          };
        }) || [];
      setOutstandingPayments(outstanding);

      // Calculate jobs by status
      const statusCounts: Record<string, number> = {};
      jobs?.forEach((job) => {
        const status = job.status || 'pending';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const totalJobs = jobs?.length || 1;
      const statusData = Object.entries(statusCounts).map(([status, count]) => ({
        status: status.replace('_', ' ').toUpperCase(),
        count,
        percentage: Math.round((count / totalJobs) * 100),
      }));
      setJobsByStatus(statusData);

      // Calculate customer analysis
      const customerData: Record<string, CustomerAnalysis> = {};
      jobs?.forEach((job) => {
        const customerName = job.customers?.name || 'Unknown';
        if (!customerData[customerName]) {
          customerData[customerName] = {
            customer: customerName,
            totalJobs: 0,
            totalBilled: 0,
            totalPaid: 0,
            outstanding: 0,
          };
        }
        customerData[customerName].totalJobs += 1;
      });

      invoices?.forEach((inv) => {
        const customerName = inv.customers?.name || 'Unknown';
        if (!customerData[customerName]) {
          customerData[customerName] = {
            customer: customerName,
            totalJobs: 0,
            totalBilled: 0,
            totalPaid: 0,
            outstanding: 0,
          };
        }
        customerData[customerName].totalBilled += inv.total_amount || 0;
        customerData[customerName].totalPaid += inv.paid_amount || 0;
        customerData[customerName].outstanding += (inv.total_amount || 0) - (inv.paid_amount || 0);
      });

      setCustomerAnalysis(Object.values(customerData));
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalOutstanding = outstandingPayments.reduce((sum, p) => sum + p.outstanding, 0);
  const totalRevenue = monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
  const totalPaid = monthlyRevenue.reduce((sum, m) => sum + m.paid, 0);
  const overduePayments = outstandingPayments.filter(p => p.daysOverdue > 0);
  const totalOverdue = overduePayments.reduce((sum, p) => sum + p.outstanding, 0);

  const exportToCSV = () => {
    const headers = ['Customer', 'Invoice', 'Issue Date', 'Due Date', 'Outstanding', 'Days Overdue'];
    const rows = outstandingPayments.map(p => [
      p.customer, p.invoice, p.issueDate, p.dueDate, p.outstanding.toFixed(2), p.daysOverdue
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outstanding-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Financial and operational insights</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={exportToCSV}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">${totalPaid.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalRevenue > 0 ? ((totalPaid/totalRevenue)*100).toFixed(1) : 0}% of revenue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">${totalOutstanding.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{outstandingPayments.length} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">${totalOverdue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{overduePayments.length} overdue</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Reports</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding Payments</TabsTrigger>
          <TabsTrigger value="jobs">Job Analysis</TabsTrigger>
          <TabsTrigger value="customers">Customer Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Collection by Month</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyRevenue.length > 0 ? (
                <>
                  <div className="h-[300px] mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))' 
                          }}
                          formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                        />
                        <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="paid" name="Collected" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Collected</TableHead>
                        <TableHead className="text-right">Pending</TableHead>
                        <TableHead className="text-right">Invoices</TableHead>
                        <TableHead className="text-right">Collection Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyRevenue.map((month) => (
                        <TableRow key={month.month}>
                          <TableCell className="font-medium">{month.month}</TableCell>
                          <TableCell className="text-right">${month.revenue.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-success">${month.paid.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-warning">${(month.revenue - month.paid).toLocaleString()}</TableCell>
                          <TableCell className="text-right">{month.invoices}</TableCell>
                          <TableCell className="text-right">
                            {month.revenue > 0 ? ((month.paid/month.revenue)*100).toFixed(1) : 0}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No revenue data available yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outstanding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Payments from Customers (Aging Report)</CardTitle>
            </CardHeader>
            <CardContent>
              {outstandingPayments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-right">Days Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outstandingPayments.map((payment, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{payment.customer}</TableCell>
                        <TableCell>{payment.invoice}</TableCell>
                        <TableCell>{formatDate(payment.issueDate)}</TableCell>
                        <TableCell>{formatDate(payment.dueDate)}</TableCell>
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
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={4}>Total Outstanding</TableCell>
                      <TableCell className="text-right text-warning">
                        ${totalOutstanding.toFixed(2)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No outstanding payments. All invoices are paid!
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Status Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {jobsByStatus.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={jobsByStatus}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="count"
                          nameKey="status"
                        >
                          {jobsByStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {jobsByStatus.map((item, index) => (
                      <div key={item.status} className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-3xl font-bold">{item.count}</p>
                        <p className="text-sm text-muted-foreground mt-1">{item.status}</p>
                        <div className="mt-2 bg-background rounded-full h-2">
                          <div 
                            className="h-2 rounded-full" 
                            style={{ 
                              width: `${item.percentage}%`,
                              backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No job data available yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {customerAnalysis.length > 0 ? (
                <>
                  <div className="h-[300px] mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={customerAnalysis.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis dataKey="customer" type="category" width={150} className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))' 
                          }}
                          formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                        />
                        <Bar dataKey="totalBilled" name="Total Billed" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="totalPaid" name="Total Paid" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Total Jobs</TableHead>
                        <TableHead className="text-right">Total Billed</TableHead>
                        <TableHead className="text-right">Total Paid</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead className="text-right">Payment Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerAnalysis.map((customer, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{customer.customer}</TableCell>
                          <TableCell className="text-right">{customer.totalJobs}</TableCell>
                          <TableCell className="text-right">${customer.totalBilled.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-success">${customer.totalPaid.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-warning">${customer.outstanding.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            {customer.totalBilled > 0 ? ((customer.totalPaid/customer.totalBilled)*100).toFixed(1) : 0}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No customer data available yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
