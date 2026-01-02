# Freight Management System - User Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Customer Management](#customer-management)
4. [Fee Management](#fee-management)
5. [Job Management](#job-management)
6. [Invoice Management](#invoice-management)
7. [Payment Management](#payment-management)
8. [Reports](#reports)
9. [Workflows & Status Management](#workflows--status-management)
10. [Settings](#settings)

---

## System Overview

The Freight Management System is a comprehensive business management application designed for freight forwarding and logistics companies. It manages the complete lifecycle from job creation to payment collection, including customer management, fee configuration, invoicing, and financial reporting.

### Key Features
- Customer and contact management
- Configurable fee structure with tax calculations
- Job tracking and charge management
- Automated invoice generation
- Payment recording and tracking
- Comprehensive financial reporting
- QuickBooks integration ready
- Multi-user role-based access

---

## User Roles & Permissions

The system supports four user roles with different access levels:

### ADMIN
- Full system access
- User management
- Settings configuration
- All CRUD operations
- Financial reports access

### OPERATIONS
- Create and manage jobs
- Create and manage customers
- View invoices
- Limited settings access

### ACCOUNTS
- Manage invoices
- Record payments
- Access all financial reports
- View jobs and customers
- Cannot create or modify fees

### VIEWER
- Read-only access
- View all records
- View reports
- Cannot create, edit, or delete

---

## Customer Management

### Overview
The Customer module manages all client information including contact details, addresses, and QuickBooks integration.

### Customer Types
- **Individual**: Personal customers
- **Company**: Business entities

### Customer Information
- Name
- Complete address
- Phone number
- Email address
- Tax ID (for tax reporting)
- Customer type (Individual/Company)
- Notes (additional information)
- Active status (active/inactive)
- QuickBooks Customer ID (for integration)
- Creation timestamp

### Features
- Add new customers
- Edit existing customer information
- Search customers by name or email
- Filter active/inactive customers
- View QuickBooks sync status
- Deactivate customers (soft delete)

### Navigation
- Main menu: **Customers**
- Add new: **Customers > Add Customer**
- Edit: Click on any customer from the list

---

## Fee Management

### Overview
The Fee module maintains a master list of all service charges that can be applied to jobs.

### Fee Information
- Fee name
- Category (grouping similar fees)
- Default rate (base amount)
- Tax rate (percentage)
- Taxable flag (whether tax applies)
- Active status
- QuickBooks Item ID (for integration)

### Features
- Add new fees
- Edit existing fees
- Search fees by name or category
- View tax information
- Activate/deactivate fees
- Track QuickBooks sync status

### Common Fee Categories
- Handling charges
- Documentation fees
- Storage charges
- Transportation fees
- Administrative charges
- Custom charges

### Navigation
- Main menu: **Fees**
- Add new: **Fees > Add Fee**
- Edit: Click on any fee from the list

---

## Job Management

### Overview
The Job module tracks freight shipments and applies relevant charges based on the configured fee structure.

### Job Information

#### Basic Details
- Job ID (unique identifier)
- Date of Report
- Rotation Number
- Status (OPEN/INVOICED/PARTIALLY_PAID/CLEARED/CANCELLED)

#### Parties
- Shipper ID
- Consignee ID
- Consignee Address
- Consignee Telephone

#### Shipment Details
- Bill of Lading Number and Type
- Equipment Quantity and Type
- Container Number
- Seal Number
- Quantity and Package Description
- Cargo Description
- Gross Weight
- Measurement

#### Charges
- Multiple charges can be added from the fee master
- Each charge includes:
  - Fee name
  - Description override (optional)
  - Amount
  - Tax amount (calculated automatically)
  - Total (amount + tax)

### Features
- Create new jobs
- Edit job details
- Add multiple charges from fee master
- Override charge descriptions
- Calculate totals with tax
- Generate invoices directly from jobs
- Search and filter jobs
- Track job status

### Job Status Flow
1. **OPEN**: Job created, charges added
2. **INVOICED**: Invoice generated from job
3. **PARTIALLY_PAID**: Partial payment received
4. **CLEARED**: Full payment received
5. **CANCELLED**: Job cancelled (optional)

### Navigation
- Main menu: **Jobs**
- Add new: **Jobs > Add Job**
- Edit: Click on any job from the list
- Generate invoice: From job list or job form

---

## Invoice Management

### Overview
The Invoice module manages billing documents generated from jobs, tracking payment status and outstanding balances.

### Invoice Information
- Invoice ID (auto-generated: INV-YYYY-XXX)
- Job ID (linked job)
- Customer ID (linked customer)
- Customer Name
- Issue Date
- Due Date (30 days from issue)
- Currency (USD)
- Invoice Lines (from job charges)
- Subtotal
- Tax Total
- Total Amount
- Amount Paid
- Balance
- Status (DRAFT/SENT/PARTIALLY_PAID/PAID/VOID)
- QuickBooks sync status

### Invoice Lines
Each line includes:
- Fee ID (linked to fee master)
- Description
- Quantity
- Unit Price
- Tax Rate
- Line Total

### Features
- Generate invoices from jobs
- View invoice details
- Print invoices (browser print)
- Track payment status
- View payment history
- Filter by status
- Search invoices
- QuickBooks integration ready

### Invoice Status Flow
1. **DRAFT**: Invoice created, not yet sent
2. **SENT**: Invoice sent to customer
3. **PARTIALLY_PAID**: Partial payment received
4. **PAID**: Full payment received
5. **VOID**: Invoice cancelled

### Automatic Status Updates
- When full payment received: Status changes to PAID
- When partial payment received: Status changes to PARTIALLY_PAID
- Balance updates automatically with each payment

### Navigation
- Main menu: **Invoices**
- View details: Click on any invoice
- Generate from job: Jobs > Generate Invoice

---

## Payment Management

### Overview
The Payment module records customer payments against invoices and updates financial status automatically.

### Payment Information
- Payment ID (auto-generated: PAY-YYYY-XXX)
- Invoice ID (linked invoice)
- Customer ID (linked customer)
- Customer Name
- Payment Date
- Amount
- Payment Method
- Reference Number
- Notes
- QuickBooks Payment ID

### Payment Methods
- **Cash**: Cash payment
- **Bank Transfer**: Wire transfer or ACH
- **Card**: Credit or debit card
- **Cheque**: Check payment

### Features
- Record new payments
- Search and select invoices
- View invoice balance
- Enter payment amount
- Select payment method
- Add reference numbers
- Add payment notes
- Automatic status updates

### Automatic Updates
When a payment is recorded:
1. **Invoice Update**:
   - Amount Paid increases
   - Balance decreases
   - Status updates to PARTIALLY_PAID or PAID

2. **Job Update**:
   - If invoice fully paid, job status changes to CLEARED

3. **Payment Record**:
   - Creates new payment record
   - Links to invoice and customer
   - Tracks payment method and reference

### Navigation
- Main menu: **Payments**
- Record payment: **Payments > Record Payment**
- View payments: Payments list

---

## Reports

### Overview
The Reports module provides comprehensive financial and operational analytics with filtering and export capabilities.

### Available Reports

#### 1. Revenue Collection Report
**Purpose**: Analyze monthly revenue and collection rates

**Filters**:
- Date Range (From/To)
- Month selection

**Metrics**:
- Total revenue by month
- Collection rate
- Outstanding amounts
- Invoice count
- Average invoice value

**Features**:
- Export to CSV
- Print report
- Monthly trend analysis

**Navigation**: Reports > Revenue Collection Report

---

#### 2. Outstanding Payments Report
**Purpose**: Track pending customer payments and aging analysis

**Filters**:
- Age range (Current, 30-60 days, 60-90 days, 90+ days)
- Customer selection

**Metrics**:
- Outstanding balance by customer
- Aging buckets
- Days outstanding
- Invoice count
- Payment history

**Features**:
- Export to CSV
- Print report
- Customer drill-down
- Aging analysis

**Navigation**: Reports > Outstanding Payments Report

---

#### 3. Job Status Report
**Purpose**: Monitor job processing status and completion rates

**Filters**:
- Month selection
- Status filter (OPEN/INVOICED/PARTIALLY_PAID/CLEARED/CANCELLED)

**Metrics**:
- Job count by status
- Revenue by status
- Completion rate
- Average processing time
- Status distribution

**Features**:
- Export to CSV
- Print report
- Status breakdown
- Monthly trends

**Navigation**: Reports > Job Status Report

---

#### 4. Customer Analysis Report
**Purpose**: Analyze customer performance and payment behavior

**Filters**:
- Sort by (Revenue, Job Count, Outstanding Balance)

**Metrics**:
- Total revenue per customer
- Job count
- Outstanding balance
- Payment behavior score
- Average job value

**Features**:
- Export to CSV
- Print report
- Customer ranking
- Performance analysis

**Navigation**: Reports > Customer Analysis Report

---

### Report Features

All reports include:
- **Filtering**: Customize data by various parameters
- **Export CSV**: Download data for Excel analysis
- **Print**: Print-friendly format
- **Real-time Data**: Always shows current information
- **Date Ranges**: Historical analysis capability

### Accessing Reports
- Main menu: **Reports**
- Select specific report from Reports menu
- Each report on separate page
- No tab navigation

---

## Workflows & Status Management

### Complete Job-to-Payment Workflow

#### Step 1: Create Job
1. Navigate to Jobs > Add Job
2. Enter shipment details
3. Add charges from fee master
4. Save job (Status: OPEN)

#### Step 2: Generate Invoice
1. From Jobs list, click "Generate Invoice" on the job
   - OR -
   From Job Form, click "Generate Invoice" button
2. System validates:
   - Job has charges
   - Customer information exists
3. Invoice created automatically (Status: DRAFT)
4. Redirects to Invoices page

#### Step 3: Send Invoice
1. View invoice from Invoices list
2. Print or send to customer
3. Update status to SENT (manual)

#### Step 4: Record Payment
1. Navigate to Payments > Record Payment
2. Search and select invoice
3. Enter payment amount
4. Select payment method
5. Add reference and notes
6. Save payment

#### Step 5: Automatic Status Updates
**If Full Payment**:
- Invoice status → PAID
- Job status → CLEARED
- Balance → $0

**If Partial Payment**:
- Invoice status → PARTIALLY_PAID
- Job status → PARTIALLY_PAID
- Balance → Remaining amount

### Status Definitions

#### Job Status
- **OPEN**: Job created, ready for invoicing
- **INVOICED**: Invoice generated
- **PARTIALLY_PAID**: Partial payment received
- **CLEARED**: Full payment received, job complete
- **CANCELLED**: Job cancelled

#### Invoice Status
- **DRAFT**: Created but not sent
- **SENT**: Sent to customer
- **PARTIALLY_PAID**: Partial payment received
- **PAID**: Fully paid
- **VOID**: Cancelled invoice

#### Payment Status
- Linked to invoice
- Updates invoice and job automatically
- Tracked with reference numbers

---

## Settings

### Overview
The Settings module allows administrators to configure system preferences and integrations.

### Configuration Options
- Company information
- Invoice templates
- Tax settings
- QuickBooks integration
- User management
- System preferences

### QuickBooks Integration
The system is ready for QuickBooks integration with fields for:
- Customer sync
- Item/Fee sync
- Invoice sync
- Payment sync

### Navigation
- Main menu: **Settings**
- Requires ADMIN role

---

## Best Practices

### Customer Management
- Keep customer information up-to-date
- Use clear naming conventions
- Add notes for special requirements
- Verify tax IDs for compliance

### Fee Structure
- Regularly review fee rates
- Maintain consistent categories
- Update tax rates as needed
- Deactivate obsolete fees instead of deleting

### Job Processing
- Complete all shipment details
- Add all relevant charges
- Verify amounts before invoicing
- Generate invoices promptly

### Invoice Management
- Generate invoices from jobs (not manually)
- Verify invoice details before sending
- Track due dates
- Follow up on overdue payments

### Payment Recording
- Record payments immediately
- Use correct payment method
- Add reference numbers
- Include payment notes

### Reporting
- Run regular financial reports
- Monitor outstanding balances
- Track revenue trends
- Analyze customer performance

---

## Troubleshooting

### Common Issues

#### Invoice Not Generating
**Cause**: No charges added to job
**Solution**: Add at least one charge with amount > 0

#### Status Not Updating
**Cause**: Payment amount doesn't match invoice balance
**Solution**: Verify payment amount equals outstanding balance for full payment

#### Can't Find Customer/Job
**Cause**: Using wrong search term
**Solution**: Use customer name or email for search

#### Print Not Working
**Cause**: Browser print dialog
**Solution**: Use browser's built-in print functionality (Ctrl+P)

---

## Support & Maintenance

### Data Backup
- Regular backups recommended
- Export reports for historical records
- Maintain QuickBooks sync

### System Updates
- Follow release notes
- Test new features in non-production
- Train users on new functionality

### User Training
- Provide role-based training
- Document custom workflows
- Maintain user guides

---

## Appendix

### Keyboard Shortcuts
- Print: Ctrl+P (on invoice/report pages)
- Search: Focus on search field in each module

### Data Retention
- All records maintained indefinitely
- Soft delete for customers and fees
- Historical data preserved

### Integration Points
- QuickBooks Desktop/Online
- Future: Email integration
- Future: PDF generation
- Future: Payment gateway integration

---

## Version History

### Current Version
- Customer Management ✓
- Fee Management ✓
- Job Management ✓
- Invoice Generation ✓
- Payment Recording ✓
- Comprehensive Reports ✓
- Status Management ✓
- Print Functionality ✓

### Coming Soon
- Email notifications
- PDF generation
- QuickBooks live sync
- Payment gateway integration
- Advanced analytics
- Mobile app

---

**Document Last Updated**: 2025-11-28
**System Version**: 1.0

For technical support or questions, please contact your system administrator.
