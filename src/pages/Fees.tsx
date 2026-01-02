import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, CheckCircle2, XCircle, Loader2, Trash2, Download } from 'lucide-react';
import { exportToCSV, formatCurrencyForCSV } from '@/lib/csvExport';
import { useFees } from '@/hooks/useFees';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

const Fees = () => {
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { fees, loading, refetch } = useFees();

  const filteredFees = fees.filter((fee) =>
    fee.name.toLowerCase().includes(search.toLowerCase()) ||
    (fee.category?.toLowerCase() || '').includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredFees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFees.map(f => f.id));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('fees')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      
      toast.success('Fee deleted successfully');
      refetch();
    } catch (error: any) {
      console.error('Error deleting fee:', error);
      toast.error('Failed to delete fee: ' + error.message);
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
        .from('fees')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;
      
      toast.success(`${selectedIds.length} fee(s) deleted successfully`);
      setSelectedIds([]);
      refetch();
    } catch (error: any) {
      console.error('Error deleting fees:', error);
      toast.error('Failed to delete fees: ' + error.message);
    } finally {
      setDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Fee Master</h1>
          <p className="text-muted-foreground">Manage fee items and charges</p>
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
              const data = filteredFees.map(fee => ({
                name: fee.name,
                category: fee.category || '',
                default_amount: formatCurrencyForCSV(fee.default_amount),
                fee_type: fee.fee_type || 'fixed',
                is_taxable: fee.is_taxable ? 'Yes' : 'No',
                tax_rate: fee.tax_rate ? `${fee.tax_rate}%` : '0%',
                is_active: fee.is_active ? 'Active' : 'Inactive',
              }));
              exportToCSV(data, 'fees-export', {
                name: 'Fee Name',
                category: 'Category',
                default_amount: 'Default Amount',
                fee_type: 'Type',
                is_taxable: 'Taxable',
                tax_rate: 'Tax Rate',
                is_active: 'Status',
              });
            }}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => navigate('/fees/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Fee
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search fees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredFees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No fees found. Create your first fee to get started.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    checked={selectedIds.length === filteredFees.length && filteredFees.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select all'}
                  </span>
                </div>
                {filteredFees.map((fee) => (
                  <div
                    key={fee.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedIds.includes(fee.id)}
                        onCheckedChange={() => toggleSelect(fee.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div 
                        className="space-y-1 flex-1 cursor-pointer"
                        onClick={() => navigate(`/fees/${fee.id}`)}
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{fee.name}</h3>
                          {fee.category && <Badge variant="secondary">{fee.category}</Badge>}
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Default Rate: ${fee.default_amount}</span>
                          {fee.is_taxable && <span>Tax: {fee.tax_rate}%</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold">${fee.default_amount}</p>
                        {fee.is_taxable && (
                          <p className="text-xs text-muted-foreground">+{fee.tax_rate}% tax</p>
                        )}
                      </div>
                      {fee.is_active ? (
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
                          setDeleteId(fee.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Single Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this fee? This action cannot be undone.
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
            <AlertDialogTitle>Delete {selectedIds.length} Fees</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} fee(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Delete ${selectedIds.length} Fees`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Fees;
