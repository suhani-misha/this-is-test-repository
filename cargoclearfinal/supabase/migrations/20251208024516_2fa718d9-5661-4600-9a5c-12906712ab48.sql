-- Add date_format column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN date_format TEXT DEFAULT 'dd-MM-yyyy';

-- Create function to recalculate customer balance
CREATE OR REPLACE FUNCTION public.recalculate_customer_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_total_outstanding NUMERIC;
BEGIN
  -- Determine the customer_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_customer_id := OLD.customer_id;
  ELSE
    v_customer_id := NEW.customer_id;
  END IF;

  -- Calculate total outstanding balance for the customer
  -- Sum of (total_amount - paid_amount) for all invoices
  SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0)
  INTO v_total_outstanding
  FROM public.invoices
  WHERE customer_id = v_customer_id
    AND status != 'void';

  -- Update customer balance
  UPDATE public.customers
  SET current_balance = v_total_outstanding,
      updated_at = now()
  WHERE id = v_customer_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Create function to recalculate customer balance based on payment changes
CREATE OR REPLACE FUNCTION public.recalculate_customer_balance_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_total_outstanding NUMERIC;
BEGIN
  -- Determine the customer_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_customer_id := OLD.customer_id;
  ELSE
    v_customer_id := NEW.customer_id;
  END IF;

  -- Calculate total outstanding balance for the customer
  SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0)
  INTO v_total_outstanding
  FROM public.invoices
  WHERE customer_id = v_customer_id
    AND status != 'void';

  -- Update customer balance
  UPDATE public.customers
  SET current_balance = v_total_outstanding,
      updated_at = now()
  WHERE id = v_customer_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_customer_balance_on_invoice ON public.invoices;
DROP TRIGGER IF EXISTS update_customer_balance_on_payment ON public.payments;

-- Create trigger for invoice changes
CREATE TRIGGER update_customer_balance_on_invoice
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_customer_balance();

-- Create trigger for payment changes
CREATE TRIGGER update_customer_balance_on_payment
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_customer_balance_on_payment();

-- Fix existing customer balances
UPDATE public.customers c
SET current_balance = COALESCE((
  SELECT SUM(total_amount - COALESCE(paid_amount, 0))
  FROM public.invoices i
  WHERE i.customer_id = c.id
    AND i.status != 'void'
), 0);