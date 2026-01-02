import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface EmailTemplate {
  id: string;
  user_id: string;
  template_type: string;
  name: string;
  subject: string;
  body_html: string;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_TEMPLATES = [
  {
    template_type: 'invoice_created',
    name: 'Invoice Created',
    subject: 'Invoice {{invoice_number}} from {{company_name}}',
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Invoice</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; color: #333;">Dear {{customer_name}},</p>
    
    <p style="font-size: 14px; color: #555; line-height: 1.6;">
      Please find attached invoice <strong>{{invoice_number}}</strong> for the amount of <strong>{{currency}}{{amount}}</strong>.
    </p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Invoice Number:</td>
          <td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right;">{{invoice_number}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Amount Due:</td>
          <td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right;">{{currency}}{{amount}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Due Date:</td>
          <td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right;">{{due_date}}</td>
        </tr>
      </table>
    </div>
    
    <p style="font-size: 14px; color: #555; line-height: 1.6;">
      Please ensure payment is made by the due date. If you have any questions regarding this invoice, please don't hesitate to contact us.
    </p>
    
    <p style="font-size: 14px; color: #555; margin-top: 30px;">
      Best regards,<br>
      <strong>{{company_name}}</strong>
    </p>
  </div>
  
  <div style="background: #f8f9fa; padding: 20px; text-align: center; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 12px; color: #999; margin: 0;">
      {{company_address}}<br>
      {{company_email}} | {{company_phone}}
    </p>
  </div>
</div>`,
  },
  {
    template_type: 'payment_received',
    name: 'Payment Received',
    subject: 'Payment Received - Thank You! ({{invoice_number}})',
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Payment Received</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; color: #333;">Dear {{customer_name}},</p>
    
    <p style="font-size: 14px; color: #555; line-height: 1.6;">
      Thank you for your payment! We have successfully received your payment of <strong>{{currency}}{{amount}}</strong> for invoice <strong>{{invoice_number}}</strong>.
    </p>
    
    <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <div style="font-size: 24px; color: #28a745; margin-bottom: 10px;">✓</div>
      <p style="font-size: 18px; color: #155724; margin: 0; font-weight: bold;">Payment Confirmed</p>
    </div>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Invoice Number:</td>
          <td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right;">{{invoice_number}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Amount Paid:</td>
          <td style="padding: 8px 0; color: #28a745; font-weight: bold; text-align: right;">{{currency}}{{amount}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Payment Date:</td>
          <td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right;">{{payment_date}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Payment Method:</td>
          <td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right;">{{payment_method}}</td>
        </tr>
      </table>
    </div>
    
    <p style="font-size: 14px; color: #555; line-height: 1.6;">
      We appreciate your prompt payment and look forward to serving you again.
    </p>
    
    <p style="font-size: 14px; color: #555; margin-top: 30px;">
      Best regards,<br>
      <strong>{{company_name}}</strong>
    </p>
  </div>
  
  <div style="background: #f8f9fa; padding: 20px; text-align: center; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 12px; color: #999; margin: 0;">
      {{company_address}}<br>
      {{company_email}} | {{company_phone}}
    </p>
  </div>
</div>`,
  },
  {
    template_type: 'payment_reminder',
    name: 'Payment Reminder',
    subject: 'Payment Reminder - Invoice {{invoice_number}} Due {{due_date}}',
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #fd7e14 0%, #ffc107 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Payment Reminder</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; color: #333;">Dear {{customer_name}},</p>
    
    <p style="font-size: 14px; color: #555; line-height: 1.6;">
      This is a friendly reminder that invoice <strong>{{invoice_number}}</strong> for <strong>{{currency}}{{amount}}</strong> is due on <strong>{{due_date}}</strong>.
    </p>
    
    <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
      <p style="font-size: 14px; color: #856404; margin: 0;">
        <strong>Outstanding Balance:</strong> {{currency}}{{amount}}
      </p>
    </div>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Invoice Number:</td>
          <td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right;">{{invoice_number}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Amount Due:</td>
          <td style="padding: 8px 0; color: #fd7e14; font-weight: bold; text-align: right;">{{currency}}{{amount}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Due Date:</td>
          <td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right;">{{due_date}}</td>
        </tr>
      </table>
    </div>
    
    <p style="font-size: 14px; color: #555; line-height: 1.6;">
      If you have already made this payment, please disregard this notice. If you have any questions or concerns regarding this invoice, please contact us.
    </p>
    
    <p style="font-size: 14px; color: #555; margin-top: 30px;">
      Best regards,<br>
      <strong>{{company_name}}</strong>
    </p>
  </div>
  
  <div style="background: #f8f9fa; padding: 20px; text-align: center; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 12px; color: #999; margin: 0;">
      {{company_address}}<br>
      {{company_email}} | {{company_phone}}
    </p>
  </div>
</div>`,
  },
  {
    template_type: 'overdue_notice',
    name: 'Overdue Notice',
    subject: 'OVERDUE: Invoice {{invoice_number}} - Immediate Attention Required',
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Overdue Notice</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; color: #333;">Dear {{customer_name}},</p>
    
    <p style="font-size: 14px; color: #555; line-height: 1.6;">
      Our records indicate that invoice <strong>{{invoice_number}}</strong> is now <strong>{{days_overdue}} days overdue</strong>. The outstanding amount of <strong>{{currency}}{{amount}}</strong> was due on <strong>{{due_date}}</strong>.
    </p>
    
    <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
      <p style="font-size: 14px; color: #721c24; margin: 0;">
        <strong>⚠ This invoice is {{days_overdue}} days past due</strong>
      </p>
    </div>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Invoice Number:</td>
          <td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right;">{{invoice_number}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Amount Overdue:</td>
          <td style="padding: 8px 0; color: #dc3545; font-weight: bold; text-align: right;">{{currency}}{{amount}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Original Due Date:</td>
          <td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right;">{{due_date}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Days Overdue:</td>
          <td style="padding: 8px 0; color: #dc3545; font-weight: bold; text-align: right;">{{days_overdue}} days</td>
        </tr>
      </table>
    </div>
    
    <p style="font-size: 14px; color: #555; line-height: 1.6;">
      Please arrange for immediate payment to avoid any further action. If you have already submitted payment, please contact us with the payment details.
    </p>
    
    <p style="font-size: 14px; color: #555; margin-top: 30px;">
      Best regards,<br>
      <strong>{{company_name}}</strong>
    </p>
  </div>
  
  <div style="background: #f8f9fa; padding: 20px; text-align: center; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 12px; color: #999; margin: 0;">
      {{company_address}}<br>
      {{company_email}} | {{company_phone}}
    </p>
  </div>
</div>`,
  },
];

export const useEmailTemplates = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('template_type');

      if (error) throw error;
      setTemplates((data || []) as EmailTemplate[]);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (template: Partial<EmailTemplate> & { template_type: string }) => {
    if (!user) return null;

    try {
      const existingTemplate = templates.find(t => t.template_type === template.template_type);
      
      if (existingTemplate) {
        const { data, error } = await supabase
          .from('email_templates')
          .update({
            name: template.name,
            subject: template.subject,
            body_html: template.body_html,
            is_active: template.is_active,
          })
          .eq('id', existingTemplate.id)
          .select()
          .single();

        if (error) throw error;
        toast.success('Template updated successfully');
        await fetchTemplates();
        return data as EmailTemplate;
      } else {
        const { data, error } = await supabase
          .from('email_templates')
          .insert({
            user_id: user.id,
            template_type: template.template_type,
            name: template.name,
            subject: template.subject,
            body_html: template.body_html,
            is_active: template.is_active ?? true,
          })
          .select()
          .single();

        if (error) throw error;
        toast.success('Template created successfully');
        await fetchTemplates();
        return data as EmailTemplate;
      }
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template: ' + error.message);
      return null;
    }
  };

  const initializeDefaultTemplates = async () => {
    if (!user) return;

    try {
      for (const defaultTemplate of DEFAULT_TEMPLATES) {
        const exists = templates.find(t => t.template_type === defaultTemplate.template_type);
        if (!exists) {
          await supabase
            .from('email_templates')
            .insert({
              user_id: user.id,
              template_type: defaultTemplate.template_type,
              name: defaultTemplate.name,
              subject: defaultTemplate.subject,
              body_html: defaultTemplate.body_html,
              is_active: true,
            });
        }
      }
      await fetchTemplates();
      toast.success('Default templates initialized');
    } catch (error: any) {
      console.error('Error initializing templates:', error);
      toast.error('Failed to initialize templates');
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  return { templates, loading, refetch: fetchTemplates, saveTemplate, initializeDefaultTemplates };
};
