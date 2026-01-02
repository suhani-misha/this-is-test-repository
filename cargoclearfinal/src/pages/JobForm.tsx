import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Plus, Trash2, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useCustomers } from '@/hooks/useCustomers';
import { useFees } from '@/hooks/useFees';
import { sendInvoiceNotification } from '@/lib/emailService';

interface JobCharge {
  id: string;
  fee_id: string;
  fee_name: string;
  amount: number;
  quantity: number;
  tax_amount: number;
  total: number;
}

const JobForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { formatDate } = useDateFormat();
  const { customers, loading: customersLoading } = useCustomers();
  const { fees, loading: feesLoading } = useFees();
  const isEdit = !!id;
  
  const [loading, setLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    job_number: `JOB-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    customer_id: '',
    description: '',
    bl_number: '',
    container_number: '',
    vessel_name: '',
    port_of_loading: '',
    port_of_discharge: '',
    cargo_type: '',
    weight: '',
    volume: '',
    status: 'pending',
  });

  const [charges, setCharges] = useState<JobCharge[]>([]);

  useEffect(() => {
    if (isEdit && id) {
      fetchJob();
    }
  }, [id, isEdit]);

  const fetchJob = async () => {
    try {
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('*, job_fees(*)')
        .eq('id', id)
        .maybeSingle();

      if (jobError) throw jobError;
      
      if (job) {
        setFormData({
          job_number: job.job_number || '',
          customer_id: job.customer_id || '',
          description: job.description || '',
          bl_number: job.bl_number || '',
          container_number: job.container_number || '',
          vessel_name: job.vessel_name || '',
          port_of_loading: job.port_of_loading || '',
          port_of_discharge: job.port_of_discharge || '',
          cargo_type: job.cargo_type || '',
          weight: job.weight?.toString() || '',
          volume: job.volume?.toString() || '',
          status: job.status || 'pending',
        });

        if (job.job_fees) {
          setCharges(job.job_fees.map((fee: any) => ({
            id: fee.id,
            fee_id: fee.fee_id || '',
            fee_name: fee.fee_name,
            amount: fee.amount,
            quantity: fee.quantity || 1,
            tax_amount: fee.tax_amount || 0,
            total: fee.total,
          })));
        }
      } else {
        toast.error('Job not found');
        navigate('/jobs');
      }
    } catch (error: any) {
      console.error('Error fetching job:', error);
      toast.error('Failed to load job');
      navigate('/jobs');
    } finally {
      setLoading(false);
    }
  };

  const addCharge = () => {
    const newCharge: JobCharge = {
      id: String(Date.now()),
      fee_id: '',
      fee_name: '',
      amount: 0,
      quantity: 1,
      tax_amount: 0,
      total: 0,
    };
    setCharges([...charges, newCharge]);
  };

  const updateCharge = (index: number, field: string, value: any) => {
    const updated = [...charges];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'fee_id') {
      const fee = fees.find(f => f.id === value);
      if (fee) {
        updated[index].fee_name = fee.name;
        updated[index].amount = fee.default_amount;
        updated[index].tax_amount = fee.is_taxable ? (fee.default_amount * (fee.tax_rate || 0)) / 100 : 0;
        updated[index].total = updated[index].amount + updated[index].tax_amount;
      }
    } else if (field === 'amount') {
      const fee = fees.find(f => f.id === updated[index].fee_id);
      updated[index].tax_amount = fee?.is_taxable ? (value * (fee.tax_rate || 0)) / 100 : 0;
      updated[index].total = value + updated[index].tax_amount;
    }
    
    setCharges(updated);
  };

  const removeCharge = (index: number) => {
    setCharges(charges.filter((_, i) => i !== index));
  };

  const totalCharges = charges.reduce((sum, charge) => sum + charge.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    if (!formData.customer_id) {
      toast.error('Please select a customer');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    setIsSubmitting(true);

    try {
      const jobData = {
        job_number: formData.job_number.trim(),
        customer_id: formData.customer_id,
        description: formData.description.trim(),
        bl_number: formData.bl_number.trim() || null,
        container_number: formData.container_number.trim() || null,
        vessel_name: formData.vessel_name.trim() || null,
        port_of_loading: formData.port_of_loading.trim() || null,
        port_of_discharge: formData.port_of_discharge.trim() || null,
        cargo_type: formData.cargo_type.trim() || null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        volume: formData.volume ? parseFloat(formData.volume) : null,
        total_amount: totalCharges,
        status: formData.status,
        user_id: user.id,
      };

      let jobId = id;

      if (isEdit) {
        const { error } = await supabase
          .from('jobs')
          .update(jobData)
          .eq('id', id);

        if (error) throw error;

        // Delete existing job fees and recreate
        await supabase.from('job_fees').delete().eq('job_id', id);
      } else {
        const { data, error } = await supabase
          .from('jobs')
          .insert(jobData)
          .select()
          .single();

        if (error) throw error;
        jobId = data.id;
      }

      // Insert job fees
      if (charges.length > 0 && jobId) {
        const jobFees = charges.map(charge => ({
          job_id: jobId,
          fee_id: charge.fee_id || null,
          fee_name: charge.fee_name,
          amount: charge.amount,
          quantity: charge.quantity,
          tax_amount: charge.tax_amount,
          total: charge.total,
        }));

        const { error: feesError } = await supabase
          .from('job_fees')
          .insert(jobFees);

        if (feesError) throw feesError;
      }

      toast.success(isEdit ? 'Job updated successfully' : 'Job created successfully');
      navigate('/jobs');
    } catch (error: any) {
      console.error('Error saving job:', error);
      toast.error('Failed to save job: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!user || !id) return;

    if (charges.length === 0) {
      toast.error('Please add at least one charge before generating invoice');
      return;
    }

    const customer = customers.find(c => c.id === formData.customer_id);
    if (!customer) {
      toast.error('Customer not found');
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if an invoice already exists for this job
      const { data: existingInvoices } = await supabase
        .from('invoices')
        .select('id, invoice_number')
        .eq('job_id', id)
        .neq('status', 'void');

      if (existingInvoices && existingInvoices.length > 0) {
        toast.error(`Invoice ${existingInvoices[0].invoice_number} already exists for this job`);
        setIsSubmitting(false);
        return;
      }

      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      
      const subtotal = charges.reduce((sum, fee) => sum + fee.amount * fee.quantity, 0);
      const taxAmount = charges.reduce((sum, fee) => sum + fee.tax_amount, 0);
      const totalAmount = charges.reduce((sum, fee) => sum + fee.total, 0);
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (customer.payment_terms || 30));

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          customer_id: formData.customer_id,
          job_id: id,
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

      const invoiceItems = charges.map(fee => ({
        invoice_id: invoice.id,
        description: fee.fee_name,
        quantity: fee.quantity,
        unit_price: fee.amount,
        tax_rate: fee.tax_amount > 0 ? (fee.tax_amount / fee.amount) * 100 : 0,
        tax_amount: fee.tax_amount,
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
        .eq('id', id);

      if (customer.email) {
        await sendInvoiceNotification({
          recipientEmail: customer.email,
          recipientName: customer.name,
          invoiceNumber,
          amount: totalAmount,
          dueDate: formatDate(dueDate),
        });
        toast.success(`Invoice ${invoiceNumber} created and notification sent!`);
      } else {
        toast.success(`Invoice ${invoiceNumber} created successfully!`);
      }

      navigate('/invoices');
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || customersLoading || feesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeCustomers = customers.filter(c => c.status === 'active');
  const activeFees = fees.filter(f => f.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/jobs')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{isEdit ? 'Edit Job Sheet' : 'New Job Sheet'}</h1>
            <p className="text-muted-foreground">
              {isEdit ? 'Update job information' : 'Create a new clearance job'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total Charges</p>
          <p className="text-2xl font-bold text-primary">${totalCharges.toFixed(2)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Job Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="job_number">Job Number *</Label>
                    <Input
                      id="job_number"
                      value={formData.job_number}
                      onChange={(e) => setFormData({ ...formData, job_number: e.target.value })}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_id">Customer *</Label>
                    <Select 
                      value={formData.customer_id} 
                      onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="customer_id">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeCustomers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Job description"
                      required
                      disabled={isSubmitting}
                      rows={2}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shipment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bl_number">B/L Number</Label>
                    <Input
                      id="bl_number"
                      value={formData.bl_number}
                      onChange={(e) => setFormData({ ...formData, bl_number: e.target.value })}
                      placeholder="BL-XXXX"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="container_number">Container Number</Label>
                    <Input
                      id="container_number"
                      value={formData.container_number}
                      onChange={(e) => setFormData({ ...formData, container_number: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vessel_name">Vessel Name</Label>
                    <Input
                      id="vessel_name"
                      value={formData.vessel_name}
                      onChange={(e) => setFormData({ ...formData, vessel_name: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cargo_type">Cargo Type</Label>
                    <Input
                      id="cargo_type"
                      value={formData.cargo_type}
                      onChange={(e) => setFormData({ ...formData, cargo_type: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="port_of_loading">Port of Loading</Label>
                    <Input
                      id="port_of_loading"
                      value={formData.port_of_loading}
                      onChange={(e) => setFormData({ ...formData, port_of_loading: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="port_of_discharge">Port of Discharge</Label>
                    <Input
                      id="port_of_discharge"
                      value={formData.port_of_discharge}
                      onChange={(e) => setFormData({ ...formData, port_of_discharge: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.01"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="volume">Volume (CBM)</Label>
                    <Input
                      id="volume"
                      type="number"
                      step="0.01"
                      value={formData.volume}
                      onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Charges</CardTitle>
                <Button type="button" size="sm" onClick={addCharge} className="gap-2" disabled={isSubmitting}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {charges.map((charge, index) => (
                    <div key={charge.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Charge {index + 1}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeCharge(index)}
                          disabled={isSubmitting}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <Select
                        value={charge.fee_id}
                        onValueChange={(value) => updateCharge(index, 'fee_id', value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select fee" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeFees.map(fee => (
                            <SelectItem key={fee.id} value={fee.id}>
                              {fee.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {charge.fee_id && (
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount:</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={charge.amount}
                              onChange={(e) => updateCharge(index, 'amount', parseFloat(e.target.value) || 0)}
                              className="h-7 w-24 text-right"
                              disabled={isSubmitting}
                            />
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tax:</span>
                            <span className="font-medium">${charge.tax_amount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t">
                            <span className="font-medium">Total:</span>
                            <span className="font-bold text-primary">${charge.total.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {charges.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No charges added yet
                    </p>
                  )}
                </div>
                {charges.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">Grand Total:</span>
                      <span className="text-xl font-bold text-primary">
                        ${totalCharges.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isEdit ? 'Update Job' : 'Create Job'}
              </Button>
              {isEdit && charges.length > 0 && (formData.status === 'pending' || formData.status === 'in_progress') && (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={handleGenerateInvoice}
                  disabled={isSubmitting}
                >
                  <FileText className="h-4 w-4" />
                  Generate Invoice
                </Button>
              )}
              {isEdit && (formData.status === 'invoiced' || formData.status === 'partially_paid' || formData.status === 'cleared') && (
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="w-full gap-2"
                  onClick={() => navigate('/invoices')}
                  disabled={isSubmitting}
                >
                  <FileText className="h-4 w-4" />
                  View Invoice
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => navigate('/jobs')} disabled={isSubmitting}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default JobForm;
