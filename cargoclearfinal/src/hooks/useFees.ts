import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Fee {
  id: string;
  name: string;
  description: string | null;
  default_amount: number;
  fee_type: string | null;
  category: string | null;
  is_taxable: boolean | null;
  tax_rate: number | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export const useFees = () => {
  const { user } = useAuth();
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFees = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('fees')
        .select('*')
        .order('name');

      if (error) throw error;
      setFees(data || []);
    } catch (error: any) {
      console.error('Error fetching fees:', error);
      toast.error('Failed to load fees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, [user]);

  return { fees, loading, refetch: fetchFees };
};
