import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Payment {
  id: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  invoices?: {
    invoice_number: string;
  };
  customers?: {
    name: string;
  };
}

export const usePayments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          invoices (invoice_number),
          customers (name)
        `)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [user]);

  return { payments, loading, refetch: fetchPayments };
};
