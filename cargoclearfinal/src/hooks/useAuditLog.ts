import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type AuditAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'login' 
  | 'logout' 
  | 'password_change'
  | 'password_reset'
  | 'email_sent'
  | 'invoice_generated'
  | 'payment_recorded';

type EntityType = 
  | 'customer' 
  | 'fee' 
  | 'job' 
  | 'invoice' 
  | 'payment' 
  | 'user' 
  | 'email_template'
  | 'invoice_template'
  | 'scheduled_report'
  | 'profile'
  | 'session';

export const useAuditLog = () => {
  const { user } = useAuth();

  const logAction = async (
    action: AuditAction,
    entityType: EntityType,
    entityId?: string,
    oldData?: Record<string, unknown>,
    newData?: Record<string, unknown>
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('log_audit', {
        p_action: action,
        p_entity_type: entityType,
        p_entity_id: entityId || null,
        p_old_data: oldData ? JSON.stringify(oldData) : null,
        p_new_data: newData ? JSON.stringify(newData) : null,
      });

      if (error) {
        console.error('Failed to log audit:', error);
      }
    } catch (err) {
      console.error('Audit log error:', err);
    }
  };

  return { logAction };
};
