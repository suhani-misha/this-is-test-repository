-- Create invoice templates table for PDF invoice customization
CREATE TABLE public.invoice_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default Template',
  header_color TEXT DEFAULT '#1e3a5f',
  accent_color TEXT DEFAULT '#f97316',
  show_logo BOOLEAN DEFAULT true,
  logo_position TEXT DEFAULT 'left',
  show_company_details BOOLEAN DEFAULT true,
  footer_text TEXT DEFAULT 'Thank you for your business!',
  payment_terms_text TEXT DEFAULT 'Payment is due within 30 days of invoice date. Please include invoice number with payment.',
  bank_details TEXT,
  additional_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own invoice templates" 
ON public.invoice_templates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invoice templates" 
ON public.invoice_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoice templates" 
ON public.invoice_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoice templates" 
ON public.invoice_templates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_invoice_templates_updated_at
BEFORE UPDATE ON public.invoice_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();