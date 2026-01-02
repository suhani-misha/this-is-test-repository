// CSV Export Utility

export const exportToCSV = (data: Record<string, any>[], filename: string, headers?: Record<string, string>) => {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Get column keys from first data item or headers
  const columnKeys = headers ? Object.keys(headers) : Object.keys(data[0]);
  
  // Create header row
  const headerRow = columnKeys.map(key => headers?.[key] || key).join(',');
  
  // Create data rows
  const dataRows = data.map(item => 
    columnKeys.map(key => {
      const value = item[key];
      // Handle special characters and formatting
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') {
        // Escape double quotes and wrap in quotes if contains comma or quotes
        const escaped = value.replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') 
          ? `"${escaped}"` 
          : escaped;
      }
      if (typeof value === 'number') {
        return value.toString();
      }
      return String(value);
    }).join(',')
  ).join('\n');

  // Combine header and data
  const csvContent = `${headerRow}\n${dataRows}`;
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Helper to format date for CSV
export const formatDateForCSV = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

// Helper to format currency for CSV
export const formatCurrencyForCSV = (amount: number) => {
  return amount.toFixed(2);
};
