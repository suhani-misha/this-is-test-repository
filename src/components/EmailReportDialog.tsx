import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { sendReportEmail } from '@/lib/reportEmailService';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EmailReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: 'revenue_report' | 'outstanding_report' | 'job_status_report' | 'customer_analysis_report';
  reportTitle: string;
  summaryData: Record<string, string | number>;
  reportDate: string;
  csvData?: string;
}

const EmailReportDialog = ({
  open,
  onOpenChange,
  reportType,
  reportTitle,
  summaryData,
  reportDate,
  csvData,
}: EmailReportDialogProps) => {
  const { user } = useAuth();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [profile, setProfile] = useState<{ company_name: string | null; company_email: string | null; full_name: string | null } | null>(null);

  useEffect(() => {
    if (user && open) {
      fetchProfile();
    }
  }, [user, open]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('company_name, company_email, full_name')
      .eq('id', user!.id)
      .maybeSingle();
    
    if (data) {
      setProfile(data);
      // Default to user's email
      if (user?.email) {
        setRecipientEmail(user.email);
      }
      if (data.full_name) {
        setRecipientName(data.full_name);
      }
    }
  };

  const handleSend = async () => {
    if (!recipientEmail) {
      toast.error('Please enter a recipient email');
      return;
    }

    setIsSending(true);
    try {
      const result = await sendReportEmail({
        type: reportType,
        recipientEmail,
        recipientName: recipientName || 'Admin',
        reportTitle,
        summaryData,
        reportDate,
        companyName: profile?.company_name || undefined,
        companyEmail: profile?.company_email || undefined,
        csvData,
      });

      if (result.success) {
        toast.success(`Report sent to ${recipientEmail}`);
        onOpenChange(false);
      } else {
        toast.error('Failed to send report: ' + (result.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error sending report:', error);
      toast.error('Failed to send report');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Report
          </DialogTitle>
          <DialogDescription>
            Send {reportTitle} to an email address
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipient-name">Recipient Name</Label>
            <Input
              id="recipient-name"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Enter recipient name"
              disabled={isSending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient-email">Recipient Email *</Label>
            <Input
              id="recipient-email"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="admin@example.com"
              disabled={isSending}
              required
            />
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Report Summary:</p>
            <p className="font-medium">{reportTitle}</p>
            <p className="text-sm text-muted-foreground">Generated on {reportDate}</p>
            {csvData && (
              <p className="text-sm text-muted-foreground mt-2">
                ✓ CSV file will be attached
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || !recipientEmail}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmailReportDialog;
