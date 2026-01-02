import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, startOfDay, endOfDay, subDays, subMonths } from 'date-fns';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useRole } from '@/contexts/RoleContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Filter, RefreshCw, Download, FileText, History, Loader2, Eye, Calendar as CalendarIcon, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AuditLog {
  id: string;
  user_id: string;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  login: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  logout: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  password_change: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  password_reset: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  email_sent: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  invoice_generated: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  payment_recorded: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
};

const entityTypeLabels: Record<string, string> = {
  customer: 'Customer',
  customers: 'Customer',
  fee: 'Fee',
  fees: 'Fee',
  job: 'Job',
  jobs: 'Job',
  invoice: 'Invoice',
  invoices: 'Invoice',
  payment: 'Payment',
  payments: 'Payment',
  user: 'User',
  email_template: 'Email Template',
  invoice_template: 'Invoice Template',
  scheduled_report: 'Scheduled Report',
  profile: 'Profile',
  session: 'Session',
};

const actionLabels: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  login: 'Logged In',
  logout: 'Logged Out',
  password_change: 'Password Changed',
  password_reset: 'Password Reset',
  email_sent: 'Email Sent',
  invoice_generated: 'Invoice Generated',
  payment_recorded: 'Payment Recorded',
};

const datePresets = [
  { label: 'Today', value: 'today', getDates: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: 'Last 7 days', value: '7days', getDates: () => ({ from: startOfDay(subDays(new Date(), 7)), to: endOfDay(new Date()) }) },
  { label: 'Last 30 days', value: '30days', getDates: () => ({ from: startOfDay(subDays(new Date(), 30)), to: endOfDay(new Date()) }) },
  { label: 'Last 3 months', value: '3months', getDates: () => ({ from: startOfDay(subMonths(new Date(), 3)), to: endOfDay(new Date()) }) },
  { label: 'All time', value: 'all', getDates: () => ({ from: null, to: null }) },
];

export default function AuditLogs() {
  const { formatDate } = useDateFormat();
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [datePreset, setDatePreset] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/dashboard');
    }
  }, [isAdmin, roleLoading, navigate]);

  const { data: auditLogs, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', searchTerm, actionFilter, entityFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (searchTerm) {
        query = query.or(`user_email.ilike.%${searchTerm}%,entity_id.ilike.%${searchTerm}%`);
      }

      if (actionFilter && actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (entityFilter && entityFilter !== 'all') {
        query = query.eq('entity_type', entityFilter);
      }

      if (dateFrom) {
        query = query.gte('created_at', startOfDay(dateFrom).toISOString());
      }

      if (dateTo) {
        query = query.lte('created_at', endOfDay(dateTo).toISOString());
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching audit logs:', error);
        throw error;
      }
      return data as AuditLog[];
    },
    enabled: isAdmin,
  });

  const handleDatePresetChange = (value: string) => {
    setDatePreset(value);
    const preset = datePresets.find(p => p.value === value);
    if (preset) {
      const { from, to } = preset.getDates();
      setDateFrom(from);
      setDateTo(to);
    }
  };

  const clearDateFilter = () => {
    setDateFrom(null);
    setDateTo(null);
    setDatePreset('all');
  };

  const getChangedFields = (oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null) => {
    if (!oldData && !newData) return [];
    if (!oldData) return Object.keys(newData || {}).map(key => ({ key, old: null, new: newData![key] }));
    if (!newData) return Object.keys(oldData).map(key => ({ key, old: oldData[key], new: null }));

    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    const changes: { key: string; old: unknown; new: unknown }[] = [];

    allKeys.forEach(key => {
      const oldVal = oldData[key];
      const newVal = newData[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ key, old: oldVal, new: newVal });
      }
    });

    return changes;
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const exportToCsv = () => {
    if (!auditLogs || auditLogs.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Date', 'User', 'Action', 'Entity Type', 'Entity ID'];
    const csvContent = [
      headers.join(','),
      ...auditLogs.map((log) =>
        [
          format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
          log.user_email || 'Unknown',
          log.action,
          log.entity_type,
          log.entity_id || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Audit logs exported successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-8 w-8" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground">
            Track all system activities and changes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportToCsv}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user email or entity ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Created</SelectItem>
                <SelectItem value="update">Updated</SelectItem>
                <SelectItem value="delete">Deleted</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="password_change">Password Change</SelectItem>
                <SelectItem value="password_reset">Password Reset</SelectItem>
                <SelectItem value="email_sent">Email Sent</SelectItem>
                <SelectItem value="invoice_generated">Invoice Generated</SelectItem>
                <SelectItem value="payment_recorded">Payment Recorded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="customers">Customer</SelectItem>
                <SelectItem value="fees">Fee</SelectItem>
                <SelectItem value="jobs">Job</SelectItem>
                <SelectItem value="invoices">Invoice</SelectItem>
                <SelectItem value="payments">Payment</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="email_template">Email Template</SelectItem>
                <SelectItem value="invoice_template">Invoice Template</SelectItem>
                <SelectItem value="session">Session</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <Select value={datePreset} onValueChange={handleDatePresetChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                {datePresets.map(preset => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, 'PP') : 'From'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom || undefined}
                  onSelect={(date) => {
                    setDateFrom(date || null);
                    setDatePreset('custom');
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, 'PP') : 'To'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo || undefined}
                  onSelect={(date) => {
                    setDateTo(date || null);
                    setDatePreset('custom');
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={clearDateFilter}>
                <X className="h-4 w-4 mr-1" />
                Clear dates
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Activity Log
            {auditLogs && auditLogs.length > 0 && (
              <Badge variant="secondary" className="ml-2">{auditLogs.length} records</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : auditLogs && auditLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>{log.user_email || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge
                          className={actionColors[log.action] || 'bg-gray-100 text-gray-800'}
                          variant="secondary"
                        >
                          {actionLabels[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {entityTypeLabels[log.entity_type] || log.entity_type}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.entity_id ? log.entity_id.substring(0, 8) + '...' : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found</p>
              <p className="text-sm">System activities will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Audit Log Details
              {selectedLog && (
                <Badge className={actionColors[selectedLog.action] || 'bg-gray-100 text-gray-800'}>
                  {actionLabels[selectedLog.action] || selectedLog.action}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Date & Time</p>
                    <p className="font-mono">{format(parseISO(selectedLog.created_at), 'yyyy-MM-dd HH:mm:ss')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">User</p>
                    <p>{selectedLog.user_email || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Entity Type</p>
                    <p>{entityTypeLabels[selectedLog.entity_type] || selectedLog.entity_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Entity ID</p>
                    <p className="font-mono text-sm break-all">{selectedLog.entity_id || '-'}</p>
                  </div>
                  {selectedLog.ip_address && (
                    <div>
                      <p className="text-sm text-muted-foreground">IP Address</p>
                      <p className="font-mono">{selectedLog.ip_address}</p>
                    </div>
                  )}
                </div>

                {/* Changes */}
                {(selectedLog.old_data || selectedLog.new_data) && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Changes</h3>
                    
                    {selectedLog.action === 'create' ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">New Record Data:</p>
                        <pre className="bg-green-50 dark:bg-green-950 p-4 rounded-lg text-sm overflow-x-auto border">
                          {JSON.stringify(selectedLog.new_data, null, 2)}
                        </pre>
                      </div>
                    ) : selectedLog.action === 'delete' ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Deleted Record Data:</p>
                        <pre className="bg-red-50 dark:bg-red-950 p-4 rounded-lg text-sm overflow-x-auto border">
                          {JSON.stringify(selectedLog.old_data, null, 2)}
                        </pre>
                      </div>
                    ) : selectedLog.action === 'update' ? (
                      <div className="space-y-4">
                        {getChangedFields(selectedLog.old_data, selectedLog.new_data).length > 0 ? (
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-1/4">Field</TableHead>
                                  <TableHead className="w-[37.5%]">Old Value</TableHead>
                                  <TableHead className="w-[37.5%]">New Value</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {getChangedFields(selectedLog.old_data, selectedLog.new_data).map((change) => (
                                  <TableRow key={change.key}>
                                    <TableCell className="font-medium">{change.key}</TableCell>
                                    <TableCell className="bg-red-50 dark:bg-red-950/30 font-mono text-sm">
                                      <pre className="whitespace-pre-wrap break-all">{formatValue(change.old)}</pre>
                                    </TableCell>
                                    <TableCell className="bg-green-50 dark:bg-green-950/30 font-mono text-sm">
                                      <pre className="whitespace-pre-wrap break-all">{formatValue(change.new)}</pre>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No changes detected</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Raw Data (collapsible) */}
                {(selectedLog.old_data || selectedLog.new_data) && (
                  <details className="group">
                    <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                      View raw data
                    </summary>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedLog.old_data && (
                        <div>
                          <p className="text-sm font-medium mb-2">Old Data</p>
                          <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto max-h-64">
                            {JSON.stringify(selectedLog.old_data, null, 2)}
                          </pre>
                        </div>
                      )}
                      {selectedLog.new_data && (
                        <div>
                          <p className="text-sm font-medium mb-2">New Data</p>
                          <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto max-h-64">
                            {JSON.stringify(selectedLog.new_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
