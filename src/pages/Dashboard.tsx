import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DollarSign, FileText, Users, TrendingUp, Loader2, Database, RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { seedSampleData } from '@/lib/seedData';
import { toast } from 'sonner';

interface DashboardStats {
  totalRevenue: number;
  totalOutstanding: number;
  activeJobs: number;
  activeCustomers: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  monthlyRevenue: number;
  collectionRate: number;
}

interface RecentJob {
  id: string;
  job_number: string;
  description: string;
  status: string;
  created_at: string;
}

interface RecentPayment {
  id: string;
  amount: number;
  payment_method: string;
  customer_name: string;
  payment_date: string;
}

const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOutstanding: 0,
    activeJobs: 0,
    activeCustomers: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    monthlyRevenue: 0,
    collectionRate: 0,
  });
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);

  const fetchDashboardData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    
    try {
      // Fetch all invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, paid_amount, status, due_date, created_at');

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const totalRevenue = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
      const totalPaid = invoices?.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0) || 0;
      
      const paidInvoices = invoices?.filter(inv => inv.status === 'paid').length || 0;
      const pendingInvoices = invoices?.filter(inv => inv.status === 'sent' || inv.status === 'draft' || inv.status === 'partially_paid').length || 0;
      const overdueInvoices = invoices?.filter(inv => 
        inv.status !== 'paid' && new Date(inv.due_date) < now
      ).length || 0;
      
      const monthlyRevenue = invoices?.filter(inv => 
        new Date(inv.created_at) >= startOfMonth
      ).reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;

      const collectionRate = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;

      // Fetch jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, job_number, description, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const activeJobs = jobs?.filter(j => 
        j.status === 'pending' || j.status === 'in_progress' || j.status === 'invoiced'
      ).length || 0;

      // Fetch customers
      const { data: customers } = await supabase
        .from('customers')
        .select('id')
        .eq('status', 'active');

      // Fetch recent payments
      const { data: payments } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_method,
          payment_date,
          customers (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalRevenue,
        totalOutstanding: totalRevenue - totalPaid,
        activeJobs,
        activeCustomers: customers?.length || 0,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        monthlyRevenue,
        collectionRate,
      });

      setRecentJobs(jobs?.slice(0, 5) || []);
      setRecentPayments(
        payments?.map(p => ({
          id: p.id,
          amount: Number(p.amount),
          payment_method: p.payment_method,
          customer_name: (p.customers as any)?.name || 'Unknown',
          payment_date: p.payment_date,
        })) || []
      );
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [user, fetchDashboardData]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        () => fetchDashboardData(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => fetchDashboardData(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        () => fetchDashboardData(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchDashboardData]);

  const handleSeedData = async () => {
    if (!user) return;

    setSeeding(true);
    try {
      const result = await seedSampleData(user.id);
      toast.success(`Sample data created: ${result.customers} customers, ${result.jobs} jobs, ${result.invoices} invoices`);
      fetchDashboardData();
    } catch (error: any) {
      console.error('Error seeding data:', error);
      toast.error(error.message || 'Failed to create sample data');
    } finally {
      setSeeding(false);
    }
  };

  const handleManualRefresh = () => {
    fetchDashboardData(true);
  };

  const statCards = [
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      description: 'All time invoices',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Outstanding',
      value: `$${stats.totalOutstanding.toLocaleString()}`,
      icon: TrendingUp,
      description: 'Pending payments',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Active Jobs',
      value: stats.activeJobs.toString(),
      icon: FileText,
      description: 'In progress',
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Customers',
      value: stats.activeCustomers.toString(),
      icon: Users,
      description: 'Active clients',
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-warning/20 text-warning';
      case 'in_progress':
        return 'bg-accent/20 text-accent';
      case 'completed':
      case 'cleared':
        return 'bg-success/20 text-success';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasData = stats.activeCustomers > 0 || recentJobs.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with auto-refresh indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your freight operations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Updated {lastUpdated.toLocaleTimeString()}</span>
            {refreshing && <Loader2 className="h-3 w-3 animate-spin" />}
          </div>
          <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {!hasData && (
            <Button onClick={handleSeedData} disabled={seeding}>
              {seeding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Load Sample Data
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Main stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-20 h-20 ${stat.bgColor} rounded-bl-full opacity-50`} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Collection Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Progress value={stats.collectionRate} className="h-2" />
              </div>
              <span className="text-2xl font-bold">{stats.collectionRate.toFixed(1)}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ${stats.totalRevenue - stats.totalOutstanding} collected of ${stats.totalRevenue}
            </p>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Month's Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${stats.monthlyRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </p>
          </CardContent>
        </Card>

        {/* Invoice Status Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Invoice Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm">Paid</span>
              </div>
              <span className="font-bold">{stats.paidInvoices}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                <span className="text-sm">Pending</span>
              </div>
              <span className="font-bold">{stats.pendingInvoices}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm">Overdue</span>
              </div>
              <span className="font-bold text-destructive">{stats.overdueInvoices}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Jobs</CardTitle>
            <span className="text-xs text-muted-foreground">Last 5 jobs</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentJobs.length > 0 ? (
                recentJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{job.job_number}</p>
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(job.created_at)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{job.description}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No jobs yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Payments</CardTitle>
            <span className="text-xs text-muted-foreground">Last 5 payments</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPayments.length > 0 ? (
                recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{payment.customer_name}</p>
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(payment.payment_date)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">
                        {payment.payment_method.replace('_', ' ')}
                      </p>
                    </div>
                    <p className="font-bold text-success">${payment.amount.toLocaleString()}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent payments</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
