import { supabase } from '@/integrations/supabase/client';

export async function seedSampleData(userId: string) {
  const today = new Date();
  
  // Create sample customers with varied profiles
  const customersData = [
    {
      user_id: userId,
      name: 'Global Shipping Co.',
      email: 'accounts@globalshipping.com',
      phone: '+1-555-100-2000',
      address: '500 Harbor Drive, Los Angeles, CA 90001',
      contact_person: 'Sarah Johnson',
      payment_terms: 30,
      credit_limit: 50000,
      current_balance: 2035,
      status: 'active',
    },
    {
      user_id: userId,
      name: 'Pacific Trade LLC',
      email: 'billing@pacifictrade.com',
      phone: '+1-555-200-3000',
      address: '123 Commerce St, San Francisco, CA 94102',
      contact_person: 'Michael Chen',
      payment_terms: 45,
      credit_limit: 75000,
      current_balance: 0,
      status: 'active',
    },
    {
      user_id: userId,
      name: 'Atlantic Imports Inc.',
      email: 'finance@atlanticimports.com',
      phone: '+1-555-300-4000',
      address: '789 Dock Avenue, New York, NY 10001',
      contact_person: 'Emily Rodriguez',
      payment_terms: 30,
      credit_limit: 100000,
      current_balance: 0,
      status: 'active',
    },
    {
      user_id: userId,
      name: 'Maritime Logistics Group',
      email: 'ap@maritimelogistics.com',
      phone: '+1-555-400-5000',
      address: '456 Port Road, Miami, FL 33101',
      contact_person: 'David Martinez',
      payment_terms: 15,
      credit_limit: 25000,
      current_balance: 1650,
      status: 'active',
    },
    {
      user_id: userId,
      name: 'Coastal Freight Solutions',
      email: 'invoices@coastalfreight.com',
      phone: '+1-555-500-6000',
      address: '321 Wharf Street, Seattle, WA 98101',
      contact_person: 'Jennifer Lee',
      payment_terms: 30,
      credit_limit: 60000,
      current_balance: 2475,
      status: 'active',
    },
  ];

  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .insert(customersData)
    .select();

  if (customersError) throw customersError;

  // Create sample fees - comprehensive freight charges
  const feesData = [
    { user_id: userId, name: 'Customs Clearance', description: 'Standard customs clearance fee', default_amount: 350, fee_type: 'fixed', is_taxable: true, tax_rate: 10, category: 'Customs', is_active: true },
    { user_id: userId, name: 'Documentation Fee', description: 'Document processing and handling', default_amount: 75, fee_type: 'fixed', is_taxable: true, tax_rate: 10, category: 'Documentation', is_active: true },
    { user_id: userId, name: 'Container Handling', description: 'Per container handling charge', default_amount: 250, fee_type: 'per_unit', is_taxable: true, tax_rate: 10, category: 'Handling', is_active: true },
    { user_id: userId, name: 'Storage Fee', description: 'Daily storage charge', default_amount: 50, fee_type: 'per_day', is_taxable: false, tax_rate: 0, category: 'Storage', is_active: true },
    { user_id: userId, name: 'Inspection Fee', description: 'Cargo inspection service', default_amount: 150, fee_type: 'fixed', is_taxable: true, tax_rate: 10, category: 'Inspection', is_active: true },
    { user_id: userId, name: 'Delivery Charges', description: 'Local delivery to destination', default_amount: 200, fee_type: 'fixed', is_taxable: true, tax_rate: 10, category: 'Transport', is_active: true },
    { user_id: userId, name: 'Port Charges', description: 'Terminal handling at port', default_amount: 175, fee_type: 'fixed', is_taxable: true, tax_rate: 10, category: 'Port', is_active: true },
    { user_id: userId, name: 'Agency Fee', description: 'Customs agent commission', default_amount: 100, fee_type: 'fixed', is_taxable: true, tax_rate: 10, category: 'Agency', is_active: true },
  ];

  const { data: fees, error: feesError } = await supabase
    .from('fees')
    .insert(feesData)
    .select();

  if (feesError) throw feesError;

  if (!customers || customers.length < 5 || !fees || fees.length < 5) {
    throw new Error('Failed to create sample data');
  }

  // Create jobs with various statuses representing the full workflow
  const jobsData = [
    // Job 1: PENDING - Ready to be invoiced (for Global Shipping)
    {
      user_id: userId,
      customer_id: customers[0].id,
      job_number: 'JOB-2024-001',
      description: 'Import of electronics from Shanghai',
      container_number: 'MSCU1234567',
      bl_number: 'MSCUSHA123456',
      vessel_name: 'MSC Oscar',
      port_of_loading: 'Shanghai, China',
      port_of_discharge: 'Los Angeles, USA',
      cargo_type: 'Electronics',
      weight: 15000,
      volume: 45,
      status: 'pending',
      total_amount: 925,
    },
    // Job 2: PENDING - Ready to be invoiced (for Pacific Trade)
    {
      user_id: userId,
      customer_id: customers[1].id,
      job_number: 'JOB-2024-002',
      description: 'Export of machinery to Tokyo',
      container_number: 'CMAU7654321',
      bl_number: 'CMAUTOK789012',
      vessel_name: 'CMA CGM Marco Polo',
      port_of_loading: 'San Francisco, USA',
      port_of_discharge: 'Tokyo, Japan',
      cargo_type: 'Machinery',
      weight: 25000,
      volume: 60,
      status: 'pending',
      total_amount: 1100,
    },
    // Job 3: INVOICED - Has invoice, awaiting payment (for Maritime Logistics)
    {
      user_id: userId,
      customer_id: customers[3].id,
      job_number: 'JOB-2024-003',
      description: 'Import of auto parts from Germany',
      container_number: 'HPLU5678901',
      bl_number: 'HPLUHAM567890',
      vessel_name: 'Hapag-Lloyd Express',
      port_of_loading: 'Hamburg, Germany',
      port_of_discharge: 'Miami, USA',
      cargo_type: 'Auto Parts',
      weight: 12000,
      volume: 35,
      status: 'invoiced',
      total_amount: 1500,
    },
    // Job 4: PARTIALLY_PAID - Has invoice with partial payment (for Coastal Freight)
    {
      user_id: userId,
      customer_id: customers[4].id,
      job_number: 'JOB-2024-004',
      description: 'Import of textiles from Mumbai',
      container_number: 'MAEU9876543',
      bl_number: 'MAEUMUM456789',
      vessel_name: 'Maersk Eindhoven',
      port_of_loading: 'Mumbai, India',
      port_of_discharge: 'Seattle, USA',
      cargo_type: 'Textiles',
      weight: 8000,
      volume: 30,
      status: 'partially_paid',
      total_amount: 825,
    },
    // Job 5: CLEARED - Fully paid (for Atlantic Imports)
    {
      user_id: userId,
      customer_id: customers[2].id,
      job_number: 'JOB-2024-005',
      description: 'Import of furniture from Vietnam',
      container_number: 'OOLU2345678',
      bl_number: 'OOLUHCM123456',
      vessel_name: 'OOCL Hong Kong',
      port_of_loading: 'Ho Chi Minh City, Vietnam',
      port_of_discharge: 'New York, USA',
      cargo_type: 'Furniture',
      weight: 18000,
      volume: 55,
      status: 'cleared',
      total_amount: 1200,
    },
    // Job 6: INVOICED - Overdue invoice (for Global Shipping - second job)
    {
      user_id: userId,
      customer_id: customers[0].id,
      job_number: 'JOB-2024-006',
      description: 'Import of pharmaceutical supplies from Switzerland',
      container_number: 'EGLV3456789',
      bl_number: 'EGLVZUR789012',
      vessel_name: 'Evergreen Ever Given',
      port_of_loading: 'Zurich, Switzerland',
      port_of_discharge: 'Los Angeles, USA',
      cargo_type: 'Pharmaceuticals',
      weight: 5000,
      volume: 15,
      status: 'invoiced',
      total_amount: 1850,
    },
  ];

  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .insert(jobsData)
    .select();

  if (jobsError) throw jobsError;
  if (!jobs || jobs.length < 6) throw new Error('Failed to create jobs');

  // Create job fees for each job
  const jobFeesData = [
    // Job 1 fees (pending job)
    { job_id: jobs[0].id, fee_id: fees[0].id, fee_name: 'Customs Clearance', amount: 350, quantity: 1, tax_amount: 35, total: 385 },
    { job_id: jobs[0].id, fee_id: fees[1].id, fee_name: 'Documentation Fee', amount: 75, quantity: 1, tax_amount: 7.50, total: 82.50 },
    { job_id: jobs[0].id, fee_id: fees[2].id, fee_name: 'Container Handling', amount: 250, quantity: 1, tax_amount: 25, total: 275 },
    { job_id: jobs[0].id, fee_id: fees[6].id, fee_name: 'Port Charges', amount: 175, quantity: 1, tax_amount: 17.50, total: 192.50 },
    
    // Job 2 fees (pending job)
    { job_id: jobs[1].id, fee_id: fees[0].id, fee_name: 'Customs Clearance', amount: 350, quantity: 1, tax_amount: 35, total: 385 },
    { job_id: jobs[1].id, fee_id: fees[1].id, fee_name: 'Documentation Fee', amount: 75, quantity: 1, tax_amount: 7.50, total: 82.50 },
    { job_id: jobs[1].id, fee_id: fees[5].id, fee_name: 'Delivery Charges', amount: 200, quantity: 1, tax_amount: 20, total: 220 },
    { job_id: jobs[1].id, fee_id: fees[7].id, fee_name: 'Agency Fee', amount: 100, quantity: 1, tax_amount: 10, total: 110 },
    { job_id: jobs[1].id, fee_id: fees[4].id, fee_name: 'Inspection Fee', amount: 150, quantity: 1, tax_amount: 15, total: 165 },
    
    // Job 3 fees (invoiced)
    { job_id: jobs[2].id, fee_id: fees[0].id, fee_name: 'Customs Clearance', amount: 350, quantity: 1, tax_amount: 35, total: 385 },
    { job_id: jobs[2].id, fee_id: fees[2].id, fee_name: 'Container Handling', amount: 250, quantity: 2, tax_amount: 50, total: 550 },
    { job_id: jobs[2].id, fee_id: fees[3].id, fee_name: 'Storage Fee', amount: 50, quantity: 5, tax_amount: 0, total: 250 },
    { job_id: jobs[2].id, fee_id: fees[6].id, fee_name: 'Port Charges', amount: 175, quantity: 1, tax_amount: 17.50, total: 192.50 },
    
    // Job 4 fees (partially paid)
    { job_id: jobs[3].id, fee_id: fees[0].id, fee_name: 'Customs Clearance', amount: 350, quantity: 1, tax_amount: 35, total: 385 },
    { job_id: jobs[3].id, fee_id: fees[1].id, fee_name: 'Documentation Fee', amount: 75, quantity: 1, tax_amount: 7.50, total: 82.50 },
    { job_id: jobs[3].id, fee_id: fees[5].id, fee_name: 'Delivery Charges', amount: 200, quantity: 1, tax_amount: 20, total: 220 },
    
    // Job 5 fees (cleared)
    { job_id: jobs[4].id, fee_id: fees[0].id, fee_name: 'Customs Clearance', amount: 350, quantity: 1, tax_amount: 35, total: 385 },
    { job_id: jobs[4].id, fee_id: fees[2].id, fee_name: 'Container Handling', amount: 250, quantity: 1, tax_amount: 25, total: 275 },
    { job_id: jobs[4].id, fee_id: fees[4].id, fee_name: 'Inspection Fee', amount: 150, quantity: 1, tax_amount: 15, total: 165 },
    { job_id: jobs[4].id, fee_id: fees[7].id, fee_name: 'Agency Fee', amount: 100, quantity: 1, tax_amount: 10, total: 110 },
    
    // Job 6 fees (invoiced - overdue)
    { job_id: jobs[5].id, fee_id: fees[0].id, fee_name: 'Customs Clearance', amount: 350, quantity: 1, tax_amount: 35, total: 385 },
    { job_id: jobs[5].id, fee_id: fees[1].id, fee_name: 'Documentation Fee', amount: 75, quantity: 1, tax_amount: 7.50, total: 82.50 },
    { job_id: jobs[5].id, fee_id: fees[2].id, fee_name: 'Container Handling', amount: 250, quantity: 2, tax_amount: 50, total: 550 },
    { job_id: jobs[5].id, fee_id: fees[4].id, fee_name: 'Inspection Fee', amount: 150, quantity: 2, tax_amount: 30, total: 330 },
    { job_id: jobs[5].id, fee_id: fees[6].id, fee_name: 'Port Charges', amount: 175, quantity: 1, tax_amount: 17.50, total: 192.50 },
  ];

  const { error: jobFeesError } = await supabase
    .from('job_fees')
    .insert(jobFeesData);

  if (jobFeesError) throw jobFeesError;

  // Create invoices linked to jobs
  const invoicesData = [
    // Invoice 1: For Job 3 (Maritime Logistics) - Sent, not paid (due in future)
    {
      user_id: userId,
      job_id: jobs[2].id,
      customer_id: customers[3].id,
      invoice_number: 'INV-2024-001',
      issue_date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      due_date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: 1250,
      tax_amount: 102.50,
      total_amount: 1650,
      paid_amount: 0,
      status: 'sent',
    },
    // Invoice 2: For Job 4 (Coastal Freight) - Partially paid
    {
      user_id: userId,
      job_id: jobs[3].id,
      customer_id: customers[4].id,
      invoice_number: 'INV-2024-002',
      issue_date: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      due_date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: 625,
      tax_amount: 62.50,
      total_amount: 687.50,
      paid_amount: 250,
      status: 'partially_paid',
    },
    // Invoice 3: For Job 5 (Atlantic Imports) - Fully paid
    {
      user_id: userId,
      job_id: jobs[4].id,
      customer_id: customers[2].id,
      invoice_number: 'INV-2024-003',
      issue_date: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      due_date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: 850,
      tax_amount: 85,
      total_amount: 935,
      paid_amount: 935,
      status: 'paid',
    },
    // Invoice 4: For Job 6 (Global Shipping) - Overdue, not paid
    {
      user_id: userId,
      job_id: jobs[5].id,
      customer_id: customers[0].id,
      invoice_number: 'INV-2024-004',
      issue_date: new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      due_date: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: 1400,
      tax_amount: 140,
      total_amount: 1540,
      paid_amount: 0,
      status: 'sent',
    },
    // Invoice 5: Another overdue invoice (Coastal Freight second invoice)
    {
      user_id: userId,
      job_id: null,
      customer_id: customers[4].id,
      invoice_number: 'INV-2024-005',
      issue_date: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      due_date: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: 1800,
      tax_amount: 180,
      total_amount: 1980,
      paid_amount: 0,
      status: 'sent',
    },
  ];

  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .insert(invoicesData)
    .select();

  if (invoicesError) throw invoicesError;
  if (!invoices || invoices.length < 5) throw new Error('Failed to create invoices');

  // Create invoice items for each invoice
  const invoiceItemsData = [
    // Invoice 1 items
    { invoice_id: invoices[0].id, description: 'Customs Clearance', quantity: 1, unit_price: 350, tax_rate: 10, tax_amount: 35, total: 385 },
    { invoice_id: invoices[0].id, description: 'Container Handling', quantity: 2, unit_price: 250, tax_rate: 10, tax_amount: 50, total: 550 },
    { invoice_id: invoices[0].id, description: 'Storage Fee', quantity: 5, unit_price: 50, tax_rate: 0, tax_amount: 0, total: 250 },
    { invoice_id: invoices[0].id, description: 'Port Charges', quantity: 1, unit_price: 175, tax_rate: 10, tax_amount: 17.50, total: 192.50 },
    
    // Invoice 2 items
    { invoice_id: invoices[1].id, description: 'Customs Clearance', quantity: 1, unit_price: 350, tax_rate: 10, tax_amount: 35, total: 385 },
    { invoice_id: invoices[1].id, description: 'Documentation Fee', quantity: 1, unit_price: 75, tax_rate: 10, tax_amount: 7.50, total: 82.50 },
    { invoice_id: invoices[1].id, description: 'Delivery Charges', quantity: 1, unit_price: 200, tax_rate: 10, tax_amount: 20, total: 220 },
    
    // Invoice 3 items
    { invoice_id: invoices[2].id, description: 'Customs Clearance', quantity: 1, unit_price: 350, tax_rate: 10, tax_amount: 35, total: 385 },
    { invoice_id: invoices[2].id, description: 'Container Handling', quantity: 1, unit_price: 250, tax_rate: 10, tax_amount: 25, total: 275 },
    { invoice_id: invoices[2].id, description: 'Inspection Fee', quantity: 1, unit_price: 150, tax_rate: 10, tax_amount: 15, total: 165 },
    { invoice_id: invoices[2].id, description: 'Agency Fee', quantity: 1, unit_price: 100, tax_rate: 10, tax_amount: 10, total: 110 },
    
    // Invoice 4 items
    { invoice_id: invoices[3].id, description: 'Customs Clearance', quantity: 1, unit_price: 350, tax_rate: 10, tax_amount: 35, total: 385 },
    { invoice_id: invoices[3].id, description: 'Documentation Fee', quantity: 1, unit_price: 75, tax_rate: 10, tax_amount: 7.50, total: 82.50 },
    { invoice_id: invoices[3].id, description: 'Container Handling', quantity: 2, unit_price: 250, tax_rate: 10, tax_amount: 50, total: 550 },
    { invoice_id: invoices[3].id, description: 'Inspection Fee', quantity: 2, unit_price: 150, tax_rate: 10, tax_amount: 30, total: 330 },
    { invoice_id: invoices[3].id, description: 'Port Charges', quantity: 1, unit_price: 175, tax_rate: 10, tax_amount: 17.50, total: 192.50 },
    
    // Invoice 5 items
    { invoice_id: invoices[4].id, description: 'Customs Clearance', quantity: 1, unit_price: 350, tax_rate: 10, tax_amount: 35, total: 385 },
    { invoice_id: invoices[4].id, description: 'Container Handling', quantity: 3, unit_price: 250, tax_rate: 10, tax_amount: 75, total: 825 },
    { invoice_id: invoices[4].id, description: 'Storage Fee', quantity: 10, unit_price: 50, tax_rate: 0, tax_amount: 0, total: 500 },
    { invoice_id: invoices[4].id, description: 'Delivery Charges', quantity: 1, unit_price: 200, tax_rate: 10, tax_amount: 20, total: 220 },
  ];

  const { error: invoiceItemsError } = await supabase
    .from('invoice_items')
    .insert(invoiceItemsData);

  if (invoiceItemsError) throw invoiceItemsError;

  // Create payments
  const paymentsData = [
    // Payment for Invoice 2 (partial)
    {
      user_id: userId,
      invoice_id: invoices[1].id,
      customer_id: customers[4].id,
      amount: 250,
      payment_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payment_method: 'Bank Transfer',
      reference_number: 'TRF-20241128-001',
      notes: 'Partial payment - remaining balance to follow',
    },
    // Payment for Invoice 3 (full - cleared)
    {
      user_id: userId,
      invoice_id: invoices[2].id,
      customer_id: customers[2].id,
      amount: 935,
      payment_date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payment_method: 'Bank Transfer',
      reference_number: 'TRF-20241203-001',
      notes: 'Full payment received',
    },
  ];

  const { error: paymentsError } = await supabase
    .from('payments')
    .insert(paymentsData);

  if (paymentsError) throw paymentsError;

  // Update job totals with actual calculated amounts
  await supabase.from('jobs').update({ total_amount: 935 }).eq('id', jobs[0].id);
  await supabase.from('jobs').update({ total_amount: 962.50 }).eq('id', jobs[1].id);
  await supabase.from('jobs').update({ total_amount: 1377.50 }).eq('id', jobs[2].id);
  await supabase.from('jobs').update({ total_amount: 687.50 }).eq('id', jobs[3].id);
  await supabase.from('jobs').update({ total_amount: 935 }).eq('id', jobs[4].id);
  await supabase.from('jobs').update({ total_amount: 1540 }).eq('id', jobs[5].id);

  return {
    customers: customers?.length || 0,
    fees: fees?.length || 0,
    jobs: jobs?.length || 0,
    invoices: invoices?.length || 0,
    payments: 2,
  };
}
