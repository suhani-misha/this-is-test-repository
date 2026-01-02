import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, CheckCircle2, XCircle, Loader2, Trash2, Download } from 'lucide-react';
import { useCustomers } from '@/hooks/useCustomers';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { exportToCSV } from '@/lib/csvExport';
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

const Customers = () => {
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { customers, loading, refetch } = useCustomers();
  const { formatDate } = useDateFormat();

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    (customer.email?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCustomers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCustomers.map(c => c.id));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      
      toast.success('Customer deleted successfully');
      refetch();
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer: ' + error.message);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;
      
      toast.success(`${selectedIds.length} customer(s) deleted successfully`);
      setSelectedIds([]);
      refetch();
    } catch (error: any) {
      console.error('Error deleting customers:', error);
      toast.error('Failed to delete customers: ' + error.message);
    } finally {
      setDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  };

  const handleExportCSV = () => {
    const exportData = filteredCustomers.map(c => ({
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      contactPerson: c.contact_person || '',
      address: c.address || '',
      paymentTerms: c.payment_terms || 30,
      creditLimit: (c.credit_limit || 0).toFixed(2),
      currentBalance: (c.current_balance || 0).toFixed(2),
      status: c.status || 'active',
    }));
    
    exportToCSV(exportData, 'customers', {
      name: 'Customer Name',
      email: 'Email',
      phone: 'Phone',
      contactPerson: 'Contact Person',
      address: 'Address',
      paymentTerms: 'Payment Terms (Days)',
      creditLimit: 'Credit Limit',
      currentBalance: 'Current Balance',
      status: 'Status',
    });
    toast.success('Customers exported to CSV');
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
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your customer database</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
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
          <Button onClick={() => navigate('/customers/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {customers.length === 0 
                ? 'No customers yet. Add your first customer to get started.'
                : 'No customers match your search.'}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Checkbox
                  checked={selectedIds.length === filteredCustomers.length && filteredCustomers.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select all'}
                </span>
              </div>
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedIds.includes(customer.id)}
                      onCheckedChange={() => toggleSelect(customer.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div 
                      className="space-y-1 flex-1 cursor-pointer"
                      onClick={() => navigate(`/customers/${customer.id}`)}
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{customer.name}</h3>
                        <Badge variant="secondary">
                          {customer.payment_terms || 30} days
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        {customer.email && <span>{customer.email}</span>}
                        {customer.phone && <span>{customer.phone}</span>}
                        {customer.contact_person && <span>Contact: {customer.contact_person}</span>}
                      </div>
                      {customer.address && (
                        <p className="text-sm text-muted-foreground">{customer.address}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {customer.current_balance && customer.current_balance > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <p className="font-semibold text-warning">${customer.current_balance.toFixed(2)}</p>
                      </div>
                    )}
                    {customer.status === 'active' ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(customer.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this customer? This action cannot be undone.
              All associated jobs and invoices may be affected.
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
            <AlertDialogTitle>Delete {selectedIds.length} Customers</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} customer(s)? This action cannot be undone.
              All associated jobs and invoices may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Delete ${selectedIds.length} Customers`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Customers;
