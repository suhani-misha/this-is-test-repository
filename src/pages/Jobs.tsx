import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, FileText, Loader2, Trash2, Download } from 'lucide-react';
import { exportToCSV, formatDateForCSV, formatCurrencyForCSV } from '@/lib/csvExport';
import { useJobs } from '@/hooks/useJobs';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { sendInvoiceNotification } from '@/lib/emailService';
import { toast } from 'sonner';
import { useDateFormat } from '@/hooks/useDateFormat';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Jobs = () => {
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { jobs, loading, refetch } = useJobs();
  const { user } = useAuth();
  const { formatDate } = useDateFormat();

  const filteredJobs = jobs.filter((job) =>
    job.job_number.toLowerCase().includes(search.toLowerCase()) ||
    job.description.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredJobs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredJobs.map(j => j.id));
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'pending':
        return 'bg-accent/20 text-accent';
      case 'in_progress':
        return 'bg-primary/20 text-primary';
      case 'invoiced':
        return 'bg-blue-500/20 text-blue-600';
      case 'partially_paid':
        return 'bg-warning/20 text-warning';
      case 'completed':
      case 'cleared':
        return 'bg-success/20 text-success';
      case 'cancelled':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const canGenerateInvoice = (job: typeof jobs[0]) => {
    // Can generate invoice if job has fees and is in pending or in_progress status
    return (job.status === 'pending' || job.status === 'in_progress') && 
           job.job_fees && job.job_fees.length > 0;
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setDeleting(true);
    try {
      // First delete associated job fees
      await supabase
        .from('job_fees')
        .delete()
        .eq('job_id', deleteId);

      // Then delete the job
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      
      toast.success('Job deleted successfully');
      refetch();
    } catch (error: any) {
      console.error('Error deleting job:', error);
      toast.error('Failed to delete job: ' + error.message);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setDeleting(true);
    try {
      // First delete associated job fees
      await supabase
        .from('job_fees')
        .delete()
        .in('job_id', selectedIds);

      // Then delete the jobs
      const { error } = await supabase
        .from('jobs')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;
      
      toast.success(`${selectedIds.length} job(s) deleted successfully`);
      setSelectedIds([]);
      refetch();
    } catch (error: any) {
      console.error('Error deleting jobs:', error);
      toast.error('Failed to delete jobs: ' + error.message);
    } finally {
      setDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  };

  const handleGenerateInvoice = async (job: typeof jobs[0], e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast.error('You must be logged in to generate invoices');
      return;
    }

    if (!job.job_fees || job.job_fees.length === 0) {
      toast.error('Cannot generate invoice: No charges added to this job');
      return;
    }

    try {
      // Check if an invoice already exists for this job
      const { data: existingInvoices } = await supabase
        .from('invoices')
        .select('id, invoice_number')
        .eq('job_id', job.id)
        .neq('status', 'void');

      if (existingInvoices && existingInvoices.length > 0) {
        toast.error(`Invoice ${existingInvoices[0].invoice_number} already exists for this job`);
        return;
      }

      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      
      const subtotal = job.job_fees.reduce((sum, fee) => sum + fee.amount * (fee.quantity || 1), 0);
      const taxAmount = job.job_fees.reduce((sum, fee) => sum + (fee.tax_amount || 0), 0);
      const totalAmount = job.job_fees.reduce((sum, fee) => sum + fee.total, 0);
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          customer_id: job.customer_id,
          job_id: job.id,
          user_id: user.id,
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'draft',
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const invoiceItems = job.job_fees.map(fee => ({
        invoice_id: invoice.id,
        description: fee.fee_name,
        quantity: fee.quantity || 1,
        unit_price: fee.amount,
        tax_rate: fee.tax_amount ? (fee.tax_amount / fee.amount) * 100 : 0,
        tax_amount: fee.tax_amount || 0,
        total: fee.total,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Update job status to 'invoiced'
      await supabase
        .from('jobs')
        .update({ status: 'invoiced' })
        .eq('id', job.id);

      if (job.customers?.email) {
        await sendInvoiceNotification({
          recipientEmail: job.customers.email,
          recipientName: job.customers.name || 'Customer',
          invoiceNumber,
          amount: totalAmount,
          dueDate: dueDate.toLocaleDateString(),
        });
        toast.success(`Invoice ${invoiceNumber} created and notification sent!`);
      } else {
        toast.success(`Invoice ${invoiceNumber} created successfully!`);
      }

      refetch();
      setTimeout(() => navigate('/invoices'), 1000);
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice: ' + error.message);
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
          <h1 className="text-3xl font-bold">Job Sheets</h1>
          <p className="text-muted-foreground">Manage clearance jobs</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={() => setShowBulkDeleteDialog(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete ({selectedIds.length})
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => {
              const data = filteredJobs.map(job => ({
                job_number: job.job_number,
                customer: job.customers?.name || '',
                description: job.description,
                status: job.status || 'pending',
                container_number: job.container_number || '',
                bl_number: job.bl_number || '',
                total_amount: formatCurrencyForCSV(job.total_amount || 0),
                created_at: formatDateForCSV(job.created_at),
              }));
              exportToCSV(data, 'jobs-export', {
                job_number: 'Job Number',
                customer: 'Customer',
                description: 'Description',
                status: 'Status',
                container_number: 'Container',
                bl_number: 'BL Number',
                total_amount: 'Total Amount',
                created_at: 'Created Date',
              });
            }}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => navigate('/jobs/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Job
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {jobs.length === 0 
                ? 'No jobs yet. Create your first job to get started.'
                : 'No jobs match your search.'}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Checkbox
                  checked={selectedIds.length === filteredJobs.length && filteredJobs.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select all'}
                </span>
              </div>
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedIds.includes(job.id)}
                      onCheckedChange={() => toggleSelect(job.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />
                    <div 
                      className="space-y-2 flex-1 cursor-pointer"
                      onClick={() => navigate(`/jobs/${job.id}`)}
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{job.job_number}</h3>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status === 'pending' ? 'Pending' :
                           job.status === 'in_progress' ? 'In Progress' :
                           job.status === 'invoiced' ? 'Invoiced' :
                           job.status === 'partially_paid' ? 'Partially Paid' :
                           job.status === 'cleared' ? 'Cleared' :
                           job.status === 'completed' ? 'Completed' :
                           job.status === 'cancelled' ? 'Cancelled' :
                           job.status || 'Pending'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">Date: </span>
                          <span className="font-medium">{formatDate(job.created_at)}</span>
                        </div>
                        {job.customers && (
                          <div>
                            <span className="text-muted-foreground">Customer: </span>
                            <span className="font-medium">{job.customers.name}</span>
                          </div>
                        )}
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Description: </span>
                          <span className="font-medium">{job.description}</span>
                        </div>
                        {job.container_number && (
                          <div>
                            <span className="text-muted-foreground">Container: </span>
                            <span className="font-medium">{job.container_number}</span>
                          </div>
                        )}
                        {job.weight && (
                          <div>
                            <span className="text-muted-foreground">Weight: </span>
                            <span className="font-medium">{job.weight} kg</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Charges</p>
                      <p className="text-2xl font-bold text-primary">
                        ${(job.total_amount || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {job.job_fees?.length || 0} line items
                      </p>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      {canGenerateInvoice(job) && (
                        <Button 
                          size="sm" 
                          className="gap-2"
                          onClick={(e) => handleGenerateInvoice(job, e)}
                        >
                          <FileText className="h-4 w-4" />
                          Generate Invoice
                        </Button>
                      )}
                      {(job.status === 'invoiced' || job.status === 'partially_paid' || job.status === 'cleared') && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/invoices');
                          }}
                        >
                          <FileText className="h-4 w-4" />
                          View Invoice
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(job.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this job? This will also delete all associated fees and charges.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} Jobs</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} job(s)? This will also delete all associated fees.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Delete ${selectedIds.length} Jobs`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Jobs;
