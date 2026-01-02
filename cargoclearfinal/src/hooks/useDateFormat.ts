import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, parse, parseISO } from 'date-fns';

export type DateFormatType = 'dd-MM-yyyy' | 'MM-dd-yyyy' | 'yyyy-MM-dd';

interface DateFormatContextType {
  dateFormat: DateFormatType;
  setDateFormat: (format: DateFormatType) => Promise<void>;
  formatDate: (date: Date | string | null | undefined) => string;
  loading: boolean;
}

const DateFormatContext = createContext<DateFormatContextType | undefined>(undefined);

export const useDateFormat = () => {
  const context = useContext(DateFormatContext);
  if (context === undefined) {
    throw new Error('useDateFormat must be used within a DateFormatProvider');
  }
  return context;
};

export const useDateFormatProvider = () => {
  const { user } = useAuth();
  const [dateFormat, setDateFormatState] = useState<DateFormatType>('dd-MM-yyyy');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDateFormat();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchDateFormat = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('date_format')
        .eq('id', user!.id)
        .maybeSingle();

      if (error) throw error;
      if (data?.date_format) {
        setDateFormatState(data.date_format as DateFormatType);
      }
    } catch (error) {
      console.error('Error fetching date format:', error);
    } finally {
      setLoading(false);
    }
  };

  const setDateFormat = async (newFormat: DateFormatType) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ date_format: newFormat })
        .eq('id', user.id);

      if (error) throw error;
      setDateFormatState(newFormat);
    } catch (error) {
      console.error('Error saving date format:', error);
      throw error;
    }
  };

  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return '-';
    
    try {
      let dateObj: Date;
      
      if (typeof date === 'string') {
        // Try to parse ISO format first
        dateObj = parseISO(date);
        if (isNaN(dateObj.getTime())) {
          // Try other common formats
          dateObj = new Date(date);
        }
      } else {
        dateObj = date;
      }

      if (isNaN(dateObj.getTime())) {
        return '-';
      }

      return format(dateObj, dateFormat);
    } catch {
      return '-';
    }
  };

  return {
    dateFormat,
    setDateFormat,
    formatDate,
    loading,
  };
};

export { DateFormatContext };
export type { DateFormatContextType };
