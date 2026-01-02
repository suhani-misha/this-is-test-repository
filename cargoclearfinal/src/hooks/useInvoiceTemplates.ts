import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface InvoiceTemplate {
  id: string;
  user_id: string;
  name: string;
  header_color: string | null;
  accent_color: string | null;
  show_logo: boolean | null;
  logo_position: string | null;
  show_company_details: boolean | null;
  footer_text: string | null;
  payment_terms_text: string | null;
  bank_details: string | null;
  additional_notes: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_INVOICE_TEMPLATE = {
  name: 'Default Template',
  header_color: '#1e3a5f',
  accent_color: '#f97316',
  show_logo: true,
  logo_position: 'left',
  show_company_details: true,
  footer_text: 'Thank you for your business!',
  payment_terms_text: 'Payment is due within 30 days of invoice date. Please include invoice number with payment.',
  bank_details: '',
  additional_notes: '',
  is_active: true,
};

export const useInvoiceTemplates = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('invoice_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as InvoiceTemplate[]);
    } catch (error: any) {
      console.error('Error fetching invoice templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (templateData: Partial<InvoiceTemplate>, templateId?: string) => {
    if (!user) return null;

    try {
      if (templateId) {
        const { data, error } = await supabase
          .from('invoice_templates')
          .update(templateData)
          .eq('id', templateId)
          .select()
          .single();

        if (error) throw error;
        toast.success('Invoice template updated successfully');
        await fetchTemplates();
        return data;
      } else {
        const { data, error } = await supabase
          .from('invoice_templates')
          .insert({
            user_id: user.id,
            ...templateData,
          })
          .select()
          .single();

        if (error) throw error;
        toast.success('Invoice template created successfully');
        await fetchTemplates();
        return data;
      }
    } catch (error: any) {
      console.error('Error saving invoice template:', error);
      toast.error('Failed to save invoice template: ' + error.message);
      return null;
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('invoice_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      toast.success('Invoice template deleted successfully');
      await fetchTemplates();
      return true;
    } catch (error: any) {
      console.error('Error deleting invoice template:', error);
      toast.error('Failed to delete template: ' + error.message);
      return false;
    }
  };

  const setActiveTemplate = async (templateId: string) => {
    if (!user) return false;

    try {
      // First, deactivate all templates
      await supabase
        .from('invoice_templates')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

      // Then activate the selected one
      const { error } = await supabase
        .from('invoice_templates')
        .update({ is_active: true })
        .eq('id', templateId);

      if (error) throw error;
      toast.success('Active template updated');
      await fetchTemplates();
      return true;
    } catch (error: any) {
      console.error('Error setting active template:', error);
      toast.error('Failed to set active template');
      return false;
    }
  };

  const getActiveTemplate = () => {
    return templates.find(t => t.is_active) || templates[0] || null;
  };

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  return { 
    templates, 
    loading, 
    refetch: fetchTemplates, 
    saveTemplate, 
    deleteTemplate,
    setActiveTemplate,
    getActiveTemplate,
  };
};
