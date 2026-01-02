import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Mail, Eye, RefreshCw, Plus, Trash2, CheckCircle2, Receipt, Star } from 'lucide-react';
import { useEmailTemplates, DEFAULT_TEMPLATES, EmailTemplate } from '@/hooks/useEmailTemplates';
import { useInvoiceTemplates, DEFAULT_INVOICE_TEMPLATE, InvoiceTemplate } from '@/hooks/useInvoiceTemplates';
import WysiwygEditor from '@/components/WysiwygEditor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TEMPLATE_VARIABLES = {
  invoice_created: [
    '{{customer_name}}', '{{invoice_number}}', '{{amount}}', '{{due_date}}',
    '{{currency}}', '{{company_name}}', '{{company_address}}', '{{company_email}}', '{{company_phone}}'
  ],
  payment_received: [
    '{{customer_name}}', '{{invoice_number}}', '{{amount}}', '{{payment_date}}',
    '{{payment_method}}', '{{currency}}', '{{company_name}}', '{{company_address}}', '{{company_email}}', '{{company_phone}}'
  ],
  payment_reminder: [
    '{{customer_name}}', '{{invoice_number}}', '{{amount}}', '{{due_date}}',
    '{{currency}}', '{{company_name}}', '{{company_address}}', '{{company_email}}', '{{company_phone}}'
  ],
  overdue_notice: [
    '{{customer_name}}', '{{invoice_number}}', '{{amount}}', '{{due_date}}', '{{days_overdue}}',
    '{{currency}}', '{{company_name}}', '{{company_address}}', '{{company_email}}', '{{company_phone}}'
  ],
};

const EmailTemplates = () => {
  const { templates, loading: emailLoading, saveTemplate, initializeDefaultTemplates } = useEmailTemplates();
  const { 
    templates: invoiceTemplates, 
    loading: invoiceLoading, 
    saveTemplate: saveInvoiceTemplate,
    deleteTemplate: deleteInvoiceTemplate,
    setActiveTemplate: setActiveInvoiceTemplate,
  } = useInvoiceTemplates();
  
  const [activeTab, setActiveTab] = useState('email');
  const [activeEmailType, setActiveEmailType] = useState('invoice_created');
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editedTemplates, setEditedTemplates] = useState<Record<string, Partial<EmailTemplate>>>({});
  
  // Invoice template state
  const [selectedInvoiceTemplateId, setSelectedInvoiceTemplateId] = useState<string | null>(null);
  const [editedInvoiceTemplate, setEditedInvoiceTemplate] = useState(DEFAULT_INVOICE_TEMPLATE);
  const [isNewInvoiceTemplate, setIsNewInvoiceTemplate] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  useEffect(() => {
    const initialEdits: Record<string, Partial<EmailTemplate>> = {};
    DEFAULT_TEMPLATES.forEach(dt => {
      const existing = templates.find(t => t.template_type === dt.template_type);
      if (existing) {
        initialEdits[dt.template_type] = {
          name: existing.name,
          subject: existing.subject,
          body_html: existing.body_html,
          is_active: existing.is_active ?? true,
        };
      } else {
        initialEdits[dt.template_type] = {
          name: dt.name,
          subject: dt.subject,
          body_html: dt.body_html,
          is_active: true,
        };
      }
    });
    setEditedTemplates(initialEdits);
  }, [templates]);

  useEffect(() => {
    if (invoiceTemplates.length > 0 && !selectedInvoiceTemplateId) {
      const activeTemplate = invoiceTemplates.find(t => t.is_active) || invoiceTemplates[0];
      setSelectedInvoiceTemplateId(activeTemplate.id);
      loadInvoiceTemplateToEdit(activeTemplate);
    }
  }, [invoiceTemplates]);

  const loadInvoiceTemplateToEdit = (template: InvoiceTemplate) => {
    setEditedInvoiceTemplate({
      name: template.name,
      header_color: template.header_color || '#1e3a5f',
      accent_color: template.accent_color || '#f97316',
      show_logo: template.show_logo ?? true,
      logo_position: template.logo_position || 'left',
      show_company_details: template.show_company_details ?? true,
      footer_text: template.footer_text || '',
      payment_terms_text: template.payment_terms_text || '',
      bank_details: template.bank_details || '',
      additional_notes: template.additional_notes || '',
      is_active: template.is_active ?? true,
    });
    setIsNewInvoiceTemplate(false);
  };

  const handleSelectInvoiceTemplate = (templateId: string) => {
    if (templateId === 'new') {
      setSelectedInvoiceTemplateId(null);
      setEditedInvoiceTemplate({ ...DEFAULT_INVOICE_TEMPLATE, name: 'New Template' });
      setIsNewInvoiceTemplate(true);
    } else {
      const template = invoiceTemplates.find(t => t.id === templateId);
      if (template) {
        setSelectedInvoiceTemplateId(templateId);
        loadInvoiceTemplateToEdit(template);
      }
    }
  };

  const handleSaveEmail = async (templateType: string) => {
    setSaving(true);
    const template = editedTemplates[templateType];
    await saveTemplate({
      template_type: templateType,
      name: template?.name || '',
      subject: template?.subject || '',
      body_html: template?.body_html || '',
      is_active: template?.is_active ?? true,
    });
    setSaving(false);
  };

  const handleSaveInvoice = async () => {
    setSaving(true);
    const result = await saveInvoiceTemplate(editedInvoiceTemplate, isNewInvoiceTemplate ? undefined : selectedInvoiceTemplateId || undefined);
    if (result && isNewInvoiceTemplate) {
      setSelectedInvoiceTemplateId(result.id);
      setIsNewInvoiceTemplate(false);
    }
    setSaving(false);
  };

  const handleDeleteInvoiceTemplate = async () => {
    if (templateToDelete) {
      await deleteInvoiceTemplate(templateToDelete);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
      
      // Select another template if available
      const remainingTemplates = invoiceTemplates.filter(t => t.id !== templateToDelete);
      if (remainingTemplates.length > 0) {
        handleSelectInvoiceTemplate(remainingTemplates[0].id);
      } else {
        setSelectedInvoiceTemplateId(null);
        setEditedInvoiceTemplate({ ...DEFAULT_INVOICE_TEMPLATE, name: 'New Template' });
        setIsNewInvoiceTemplate(true);
      }
    }
  };

  const handleSetActiveTemplate = async (templateId: string) => {
    await setActiveInvoiceTemplate(templateId);
  };

  const handleFieldChange = (templateType: string, field: string, value: string | boolean) => {
    setEditedTemplates(prev => ({
      ...prev,
      [templateType]: {
        ...prev[templateType],
        [field]: value,
      },
    }));
  };

  const handleInvoiceFieldChange = (field: string, value: string | boolean) => {
    setEditedInvoiceTemplate(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const getPreviewHtml = (templateType: string) => {
    const template = editedTemplates[templateType];
    if (!template?.body_html) return '';
    
    let html = template.body_html;
    const sampleData: Record<string, string> = {
      '{{customer_name}}': 'John Smith',
      '{{invoice_number}}': 'INV-2024-0001',
      '{{amount}}': '1,250.00',
      '{{due_date}}': 'January 15, 2024',
      '{{payment_date}}': 'January 10, 2024',
      '{{payment_method}}': 'Bank Transfer',
      '{{days_overdue}}': '15',
      '{{currency}}': '$',
      '{{company_name}}': 'CargoClear Ltd',
      '{{company_address}}': '123 Business Street, City, Country',
      '{{company_email}}': 'info@cargoclear.com',
      '{{company_phone}}': '+1 234 567 8900',
    };
    
    Object.entries(sampleData).forEach(([key, value]) => {
      html = html.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    
    return html;
  };

  const isTemplateConfigured = (templateType: string) => {
    return templates.some(t => t.template_type === templateType);
  };

  const loading = emailLoading || invoiceLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Templates</h1>
          <p className="text-muted-foreground">Configure email and invoice templates</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="invoice" className="gap-2">
            <Receipt className="h-4 w-4" />
            Invoice Templates
          </TabsTrigger>
        </TabsList>

        {/* Email Templates Tab */}
        <TabsContent value="email" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Template Editor
                  </CardTitle>
                  <CardDescription>
                    Customize the emails sent to your customers using the visual editor
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  onClick={initializeDefaultTemplates}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset to Defaults
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Email Type Selector - Vertical on left */}
                <div className="lg:w-56 flex-shrink-0">
                  <Label className="text-sm font-medium mb-3 block">Email Type</Label>
                  <div className="flex flex-col gap-2">
                    {DEFAULT_TEMPLATES.map(dt => (
                      <button
                        key={dt.template_type}
                        onClick={() => setActiveEmailType(dt.template_type)}
                        className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                          activeEmailType === dt.template_type 
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : 'bg-card hover:bg-muted border-border'
                        }`}
                      >
                        <span className="text-sm font-medium">{dt.name}</span>
                        {isTemplateConfigured(dt.template_type) ? (
                          <CheckCircle2 className={`h-4 w-4 ${activeEmailType === dt.template_type ? 'text-primary-foreground' : 'text-green-500'}`} />
                        ) : (
                          <Badge variant="outline" className="text-xs">Not Saved</Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email Editor - Right side */}
                <div className="flex-1 space-y-6">
                  {DEFAULT_TEMPLATES.filter(dt => dt.template_type === activeEmailType).map(dt => (
                    <div key={dt.template_type} className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Label htmlFor={`active-${dt.template_type}`}>Template Active</Label>
                          <Switch
                            id={`active-${dt.template_type}`}
                            checked={editedTemplates[dt.template_type]?.is_active ?? true}
                            onCheckedChange={(checked) => handleFieldChange(dt.template_type, 'is_active', checked)}
                          />
                        </div>
                        <Badge variant={isTemplateConfigured(dt.template_type) ? "default" : "secondary"}>
                          {isTemplateConfigured(dt.template_type) ? "Configured" : "Not Saved"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`name-${dt.template_type}`}>Template Name</Label>
                          <Input
                            id={`name-${dt.template_type}`}
                            value={editedTemplates[dt.template_type]?.name || ''}
                            onChange={(e) => handleFieldChange(dt.template_type, 'name', e.target.value)}
                            placeholder="Template name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`subject-${dt.template_type}`}>Email Subject</Label>
                          <Input
                            id={`subject-${dt.template_type}`}
                            value={editedTemplates[dt.template_type]?.subject || ''}
                            onChange={(e) => handleFieldChange(dt.template_type, 'subject', e.target.value)}
                            placeholder="Email subject line"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Email Body</Label>
                        <WysiwygEditor
                          content={editedTemplates[dt.template_type]?.body_html || ''}
                          onChange={(content) => handleFieldChange(dt.template_type, 'body_html', content)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Available Variables (click to copy)</Label>
                        <div className="flex flex-wrap gap-2">
                          {TEMPLATE_VARIABLES[dt.template_type as keyof typeof TEMPLATE_VARIABLES]?.map(variable => (
                            <Badge 
                              key={variable} 
                              variant="outline" 
                              className="cursor-pointer hover:bg-muted"
                              onClick={() => {
                                navigator.clipboard.writeText(variable);
                              }}
                            >
                              {variable}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4 border-t">
                        <Button 
                          onClick={() => handleSaveEmail(dt.template_type)} 
                          disabled={saving}
                          className="gap-2"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Save Template
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setPreviewOpen(true)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoice Templates Tab */}
        <TabsContent value="invoice" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Invoice PDF Templates
                  </CardTitle>
                  <CardDescription>
                    Create and manage multiple invoice templates for different purposes
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => handleSelectInvoiceTemplate('new')}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Template Selector - Left side */}
                <div className="lg:w-64 flex-shrink-0">
                  <Label className="text-sm font-medium mb-3 block">Your Templates</Label>
                  <div className="flex flex-col gap-2">
                    {invoiceTemplates.length === 0 && !isNewInvoiceTemplate ? (
                      <p className="text-sm text-muted-foreground p-3 border rounded-lg">
                        No templates yet. Click "New Template" to create one.
                      </p>
                    ) : (
                      <>
                        {invoiceTemplates.map(template => (
                          <button
                            key={template.id}
                            onClick={() => handleSelectInvoiceTemplate(template.id)}
                            className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                              selectedInvoiceTemplateId === template.id && !isNewInvoiceTemplate
                                ? 'bg-primary text-primary-foreground border-primary' 
                                : 'bg-card hover:bg-muted border-border'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {template.is_active && (
                                <Star className={`h-4 w-4 ${selectedInvoiceTemplateId === template.id && !isNewInvoiceTemplate ? 'text-primary-foreground' : 'text-yellow-500'}`} />
                              )}
                              <span className="text-sm font-medium">{template.name}</span>
                            </div>
                            {template.is_active && (
                              <Badge variant={selectedInvoiceTemplateId === template.id && !isNewInvoiceTemplate ? "secondary" : "default"} className="text-xs">
                                Active
                              </Badge>
                            )}
                          </button>
                        ))}
                        {isNewInvoiceTemplate && (
                          <button
                            className="flex items-center justify-between p-3 rounded-lg border text-left bg-primary text-primary-foreground border-primary"
                          >
                            <span className="text-sm font-medium">New Template</span>
                            <Badge variant="secondary" className="text-xs">Unsaved</Badge>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Template Editor - Right side */}
                <div className="flex-1 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Appearance */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Appearance</h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="template-name">Template Name</Label>
                        <Input
                          id="template-name"
                          value={editedInvoiceTemplate.name}
                          onChange={(e) => handleInvoiceFieldChange('name', e.target.value)}
                          placeholder="Template name"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="header-color">Header Color</Label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              id="header-color"
                              value={editedInvoiceTemplate.header_color}
                              onChange={(e) => handleInvoiceFieldChange('header_color', e.target.value)}
                              className="w-12 h-10 rounded cursor-pointer border border-border"
                            />
                            <Input
                              value={editedInvoiceTemplate.header_color}
                              onChange={(e) => handleInvoiceFieldChange('header_color', e.target.value)}
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="accent-color">Accent Color</Label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              id="accent-color"
                              value={editedInvoiceTemplate.accent_color}
                              onChange={(e) => handleInvoiceFieldChange('accent_color', e.target.value)}
                              className="w-12 h-10 rounded cursor-pointer border border-border"
                            />
                            <Input
                              value={editedInvoiceTemplate.accent_color}
                              onChange={(e) => handleInvoiceFieldChange('accent_color', e.target.value)}
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-logo">Show Company Logo</Label>
                        <Switch
                          id="show-logo"
                          checked={editedInvoiceTemplate.show_logo}
                          onCheckedChange={(checked) => handleInvoiceFieldChange('show_logo', checked)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="logo-position">Logo Position</Label>
                        <Select
                          value={editedInvoiceTemplate.logo_position}
                          onValueChange={(value) => handleInvoiceFieldChange('logo_position', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-company">Show Company Details</Label>
                        <Switch
                          id="show-company"
                          checked={editedInvoiceTemplate.show_company_details}
                          onCheckedChange={(checked) => handleInvoiceFieldChange('show_company_details', checked)}
                        />
                      </div>
                    </div>

                    {/* Right Column - Content */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Content</h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="footer-text">Footer Text</Label>
                        <Input
                          id="footer-text"
                          value={editedInvoiceTemplate.footer_text}
                          onChange={(e) => handleInvoiceFieldChange('footer_text', e.target.value)}
                          placeholder="Thank you for your business!"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="payment-terms">Payment Terms</Label>
                        <Textarea
                          id="payment-terms"
                          value={editedInvoiceTemplate.payment_terms_text}
                          onChange={(e) => handleInvoiceFieldChange('payment_terms_text', e.target.value)}
                          placeholder="Payment terms and conditions..."
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bank-details">Bank Details</Label>
                        <Textarea
                          id="bank-details"
                          value={editedInvoiceTemplate.bank_details}
                          onChange={(e) => handleInvoiceFieldChange('bank_details', e.target.value)}
                          placeholder="Bank name, account number, routing number..."
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="additional-notes">Additional Notes</Label>
                        <Textarea
                          id="additional-notes"
                          value={editedInvoiceTemplate.additional_notes}
                          onChange={(e) => handleInvoiceFieldChange('additional_notes', e.target.value)}
                          placeholder="Any additional information to include..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    <Button 
                      onClick={handleSaveInvoice} 
                      disabled={saving}
                      className="gap-2"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {isNewInvoiceTemplate ? 'Create Template' : 'Save Template'}
                    </Button>
                    {!isNewInvoiceTemplate && selectedInvoiceTemplateId && (
                      <>
                        {!invoiceTemplates.find(t => t.id === selectedInvoiceTemplateId)?.is_active && (
                          <Button 
                            variant="outline"
                            onClick={() => handleSetActiveTemplate(selectedInvoiceTemplateId)}
                            className="gap-2"
                          >
                            <Star className="h-4 w-4" />
                            Set as Active
                          </Button>
                        )}
                        <Button 
                          variant="destructive"
                          onClick={() => {
                            setTemplateToDelete(selectedInvoiceTemplateId);
                            setDeleteDialogOpen(true);
                          }}
                          className="gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Preview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Invoice Preview
              </CardTitle>
              <CardDescription>
                Preview of how your invoice will appear
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="border rounded-lg p-8 bg-white"
                style={{ maxWidth: '600px', margin: '0 auto' }}
              >
                {/* Header */}
                <div 
                  className="p-6 rounded-t-lg text-white mb-6"
                  style={{ backgroundColor: editedInvoiceTemplate.header_color }}
                >
                  <div className={`flex ${editedInvoiceTemplate.logo_position === 'center' ? 'justify-center' : editedInvoiceTemplate.logo_position === 'right' ? 'justify-end' : 'justify-start'}`}>
                    {editedInvoiceTemplate.show_logo && (
                      <div className="w-16 h-16 bg-white/20 rounded flex items-center justify-center text-white font-bold">
                        LOGO
                      </div>
                    )}
                  </div>
                  {editedInvoiceTemplate.show_company_details && (
                    <div className="mt-4">
                      <h2 className="text-xl font-bold">Company Name</h2>
                      <p className="text-sm opacity-80">123 Business Street, City</p>
                    </div>
                  )}
                </div>

                {/* Invoice Title */}
                <div className="flex justify-between mb-6">
                  <div>
                    <h3 className="font-semibold">Bill To:</h3>
                    <p>Customer Name</p>
                    <p className="text-muted-foreground text-sm">customer@email.com</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-bold" style={{ color: editedInvoiceTemplate.header_color }}>INVOICE</h2>
                    <p className="text-muted-foreground">#INV-2024-0001</p>
                  </div>
                </div>

                {/* Table Preview */}
                <div className="border rounded mb-6">
                  <div 
                    className="grid grid-cols-4 gap-2 p-3 text-white text-sm font-medium"
                    style={{ backgroundColor: editedInvoiceTemplate.header_color }}
                  >
                    <span>Description</span>
                    <span className="text-center">Qty</span>
                    <span className="text-right">Price</span>
                    <span className="text-right">Total</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 p-3 text-sm border-b">
                    <span>Sample Service</span>
                    <span className="text-center">1</span>
                    <span className="text-right">$500.00</span>
                    <span className="text-right">$500.00</span>
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-6">
                  <div className="w-48">
                    <div className="flex justify-between py-1">
                      <span>Subtotal:</span>
                      <span>$500.00</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Tax:</span>
                      <span>$50.00</span>
                    </div>
                    <div 
                      className="flex justify-between py-2 font-bold border-t mt-2"
                      style={{ color: editedInvoiceTemplate.header_color }}
                    >
                      <span>Total:</span>
                      <span>$550.00</span>
                    </div>
                  </div>
                </div>

                {/* Bank Details */}
                {editedInvoiceTemplate.bank_details && (
                  <div className="border-t pt-4 mb-4">
                    <h4 className="font-semibold mb-2">Bank Details</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {editedInvoiceTemplate.bank_details}
                    </p>
                  </div>
                )}

                {/* Payment Terms */}
                {editedInvoiceTemplate.payment_terms_text && (
                  <div className="border-t pt-4 mb-4">
                    <h4 className="font-semibold mb-2">Payment Terms</h4>
                    <p className="text-sm text-muted-foreground">
                      {editedInvoiceTemplate.payment_terms_text}
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div 
                  className="text-center pt-4 border-t"
                  style={{ color: editedInvoiceTemplate.accent_color }}
                >
                  <p className="font-medium">{editedInvoiceTemplate.footer_text}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Email Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              This is how the email will appear with sample data
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 border rounded-lg overflow-hidden">
            <div 
              dangerouslySetInnerHTML={{ __html: getPreviewHtml(activeEmailType) }}
              className="bg-white"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInvoiceTemplate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmailTemplates;
