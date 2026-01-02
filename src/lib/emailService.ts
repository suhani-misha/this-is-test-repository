import { supabase } from '@/integrations/supabase/client';

interface SendInvoiceEmailParams {
  recipientEmail: string;
  recipientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  pdfBase64?: string;
  userId?: string;
}

interface SendPaymentEmailParams {
  recipientEmail: string;
  recipientName: string;
  invoiceNumber: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  userId?: string;
}

interface SendReminderEmailParams {
  recipientEmail: string;
  recipientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  daysOverdue?: number;
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  userId?: string;
}

export const sendInvoiceNotification = async (params: SendInvoiceEmailParams) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        type: 'invoice_created',
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        invoiceNumber: params.invoiceNumber,
        amount: params.amount,
        dueDate: params.dueDate,
        companyName: params.companyName,
        companyAddress: params.companyAddress,
        companyEmail: params.companyEmail,
        companyPhone: params.companyPhone,
        pdfBase64: params.pdfBase64,
        userId: params.userId,
      },
    });

    if (error) {
      console.error('Error sending invoice notification:', error);
      return { success: false, error };
    }

    console.log('Invoice notification sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending invoice notification:', error);
    return { success: false, error };
  }
};

export const sendPaymentNotification = async (params: SendPaymentEmailParams) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        type: 'payment_received',
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        invoiceNumber: params.invoiceNumber,
        amount: params.amount,
        paymentMethod: params.paymentMethod,
        paymentDate: params.paymentDate,
        companyName: params.companyName,
        companyAddress: params.companyAddress,
        companyEmail: params.companyEmail,
        companyPhone: params.companyPhone,
        userId: params.userId,
      },
    });

    if (error) {
      console.error('Error sending payment notification:', error);
      return { success: false, error };
    }

    console.log('Payment notification sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending payment notification:', error);
    return { success: false, error };
  }
};

export const sendPaymentReminder = async (params: SendReminderEmailParams) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        type: 'payment_reminder',
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        invoiceNumber: params.invoiceNumber,
        amount: params.amount,
        dueDate: params.dueDate,
        companyName: params.companyName,
        companyAddress: params.companyAddress,
        companyEmail: params.companyEmail,
        companyPhone: params.companyPhone,
        userId: params.userId,
      },
    });

    if (error) {
      console.error('Error sending payment reminder:', error);
      return { success: false, error };
    }

    console.log('Payment reminder sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending payment reminder:', error);
    return { success: false, error };
  }
};

export const sendOverdueNotice = async (params: SendReminderEmailParams) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        type: 'overdue_notice',
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        invoiceNumber: params.invoiceNumber,
        amount: params.amount,
        dueDate: params.dueDate,
        daysOverdue: params.daysOverdue,
        companyName: params.companyName,
        companyAddress: params.companyAddress,
        companyEmail: params.companyEmail,
        companyPhone: params.companyPhone,
        userId: params.userId,
      },
    });

    if (error) {
      console.error('Error sending overdue notice:', error);
      return { success: false, error };
    }

    console.log('Overdue notice sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending overdue notice:', error);
    return { success: false, error };
  }
};
