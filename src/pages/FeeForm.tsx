import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const FeeForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    defaultAmount: 0,
    taxRate: 15,
    isTaxable: true,
    isActive: true,
    description: '',
  });

  useEffect(() => {
    if (isEdit && id) {
      fetchFee();
    }
  }, [id, isEdit]);

  const fetchFee = async () => {
    try {
      const { data, error } = await supabase
        .from('fees')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setFormData({
          name: data.name,
          category: data.category || '',
          defaultAmount: data.default_amount,
          taxRate: data.tax_rate || 0,
          isTaxable: data.is_taxable || false,
          isActive: data.is_active ?? true,
          description: data.description || '',
        });
      }
    } catch (error: any) {
      console.error('Error fetching fee:', error);
      toast.error('Failed to load fee');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const feeData = {
        name: formData.name,
        category: formData.category || null,
        default_amount: formData.defaultAmount,
        tax_rate: formData.isTaxable ? formData.taxRate : 0,
        is_taxable: formData.isTaxable,
        is_active: formData.isActive,
        description: formData.description || null,
        user_id: user.id,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('fees')
          .update(feeData)
          .eq('id', id);
        if (error) throw error;
        toast.success('Fee updated successfully');
      } else {
        const { error } = await supabase
          .from('fees')
          .insert(feeData);
        if (error) throw error;
        toast.success('Fee created successfully');
      }
      navigate('/fees');
    } catch (error: any) {
      console.error('Error saving fee:', error);
      toast.error(error.message || 'Failed to save fee');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/fees')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? 'Edit Fee' : 'Add Fee'}</h1>
          <p className="text-muted-foreground">
            {isEdit ? 'Update fee information' : 'Create a new fee item'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Fee Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">Fee Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Port Charges, Customs Duty"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Port Services, Government Fees"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultAmount">Default Amount *</Label>
                <Input
                  id="defaultAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.defaultAmount}
                  onChange={(e) => setFormData({ ...formData, defaultAmount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>

              <div className="col-span-2 flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="isTaxable">Taxable</Label>
                  <p className="text-sm text-muted-foreground">
                    Apply tax rate to this fee
                  </p>
                </div>
                <Switch
                  id="isTaxable"
                  checked={formData.isTaxable}
                  onCheckedChange={(checked) => setFormData({ ...formData, isTaxable: checked })}
                />
              </div>

              {formData.isTaxable && (
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="taxRate">Tax Rate (%) *</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                    placeholder="15.00"
                    required
                  />
                </div>
              )}

              <div className="col-span-2 flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">Active Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Inactive fees won't appear in job sheet charge selections
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="gap-2" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                {isEdit ? 'Update Fee' : 'Create Fee'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/fees')}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default FeeForm;
