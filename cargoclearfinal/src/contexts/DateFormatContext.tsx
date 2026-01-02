import React, { ReactNode } from 'react';
import { DateFormatContext, useDateFormatProvider, DateFormatContextType } from '@/hooks/useDateFormat';

interface DateFormatProviderProps {
  children: ReactNode;
}

export const DateFormatProvider: React.FC<DateFormatProviderProps> = ({ children }) => {
  const dateFormatValue = useDateFormatProvider();
  
  return (
    <DateFormatContext.Provider value={dateFormatValue}>
      {children}
    </DateFormatContext.Provider>
  );
};

export { DateFormatContext };
export type { DateFormatContextType };
