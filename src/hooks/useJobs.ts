import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface JobFee {
  id: string;
  job_id: string;
  fee_id: string | null;
  fee_name: string;
  amount: number;
  quantity: number | null;
  tax_amount: number | null;
  total: number;
}

export interface Job {
  id: string;
  job_number: string;
  customer_id: string;
  description: string;
  status: string | null;
  bl_number: string | null;
  container_number: string | null;
  vessel_name: string | null;
  port_of_loading: string | null;
  port_of_discharge: string | null;
  eta: string | null;
  cargo_type: string | null;
  weight: number | null;
  volume: number | null;
  total_amount: number | null;
  created_at: string;
  updated_at: string;
  customers?: {
    name: string;
    email: string | null;
  };
  job_fees?: JobFee[];
}

export const useJobs = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customers (name, email),
          job_fees (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [user]);

  return { jobs, loading, refetch: fetchJobs };
};
