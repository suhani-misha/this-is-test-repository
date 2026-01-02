import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Trash2, Loader2, Mail, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { toast } from 'sonner';

interface ScheduledReport {
  id: string;
  report_type: string;
  frequency: string;
  day_of_week: number | null;
  day_of_month: number | null;
  email_recipient: string;
  is_active: boolean;
  last_sent_at: string | null;
  created_at: string;
}

const REPORT_TYPES = [
  { value: 'revenue', label: 'Revenue Report' },
  { value: 'outstanding', label: 'Outstanding Payments Report' },
  { value: 'job_status', label: 'Job Status Report' },
  { value: 'customer_analysis', label: 'Customer Analysis Report' },
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const ScheduledReportsCard = () => {
  const { user } = useAuth();
  const { formatDate } = useDateFormat();
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [newReportType, setNewReportType] = useState('revenue');
  const [newFrequency, setNewFrequency] = useState('weekly');
  const [newDayOfWeek, setNewDayOfWeek] = useState(1);
  const [newDayOfMonth, setNewDayOfMonth] = useState(1);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    if (user) {
      fetchSchedules();
      setNewEmail(user.email || '');
    }
  }, [user]);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchedules((data || []) as ScheduledReport[]);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to load scheduled reports');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!user || !newEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setSaving(true);
    try {
      const scheduleData = {
        user_id: user.id,
        report_type: newReportType,
        frequency: newFrequency,
        day_of_week: newFrequency === 'weekly' ? newDayOfWeek : null,
        day_of_month: newFrequency === 'monthly' ? newDayOfMonth : null,
        email_recipient: newEmail,
        is_active: true,
      };

      const { error } = await supabase
        .from('scheduled_reports')
        .insert(scheduleData);

      if (error) throw error;

      toast.success('Scheduled report created');
      setShowAddForm(false);
      fetchSchedules();
    } catch (error: any) {
      console.error('Error creating schedule:', error);
      toast.error('Failed to create schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      setSchedules(schedules.map(s => 
        s.id === id ? { ...s, is_active: !isActive } : s
      ));
      toast.success(isActive ? 'Schedule paused' : 'Schedule activated');
    } catch (error) {
      console.error('Error toggling schedule:', error);
      toast.error('Failed to update schedule');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSchedules(schedules.filter(s => s.id !== id));
      toast.success('Schedule deleted');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete schedule');
    }
  };

  const handleTestSend = async (schedule: ScheduledReport) => {
    setSendingTest(schedule.id);
    try {
      const { data, error } = await supabase.functions.invoke('send-scheduled-reports', {
        body: { testMode: true, scheduleId: schedule.id },
      });

      if (error) throw error;
      
      toast.success(`Test email sent to ${schedule.email_recipient}`);
    } catch (error: any) {
      console.error('Error sending test:', error);
      toast.error('Failed to send test email: ' + error.message);
    } finally {
      setSendingTest(null);
    }
  };

  const getReportLabel = (type: string) => 
    REPORT_TYPES.find(r => r.value === type)?.label || type;

  const getFrequencyLabel = (schedule: ScheduledReport) => {
    if (schedule.frequency === 'daily') return 'Daily';
    if (schedule.frequency === 'weekly') {
      const day = DAYS_OF_WEEK.find(d => d.value === schedule.day_of_week);
      return `Weekly on ${day?.label || 'Monday'}`;
    }
    if (schedule.frequency === 'monthly') {
      return `Monthly on day ${schedule.day_of_month || 1}`;
    }
    return schedule.frequency;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Scheduled Report Delivery
            </CardTitle>
            <CardDescription>Configure automatic report emails</CardDescription>
          </div>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Schedule
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm && (
          <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
            <h4 className="font-medium">New Scheduled Report</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={newReportType} onValueChange={setNewReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={newFrequency} onValueChange={setNewFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(freq => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {newFrequency === 'weekly' && (
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select 
                    value={newDayOfWeek.toString()} 
                    onValueChange={(v) => setNewDayOfWeek(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(day => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newFrequency === 'monthly' && (
                <div className="space-y-2">
                  <Label>Day of Month</Label>
                  <Select 
                    value={newDayOfMonth.toString()} 
                    onValueChange={(v) => setNewDayOfMonth(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Email Recipient</Label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddSchedule} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Create Schedule'
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {schedules.length === 0 && !showAddForm ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No scheduled reports configured</p>
            <p className="text-sm">Add a schedule to receive reports automatically</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div 
                key={schedule.id} 
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getReportLabel(schedule.report_type)}</span>
                    <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                      {schedule.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getFrequencyLabel(schedule)} • {schedule.email_recipient}
                  </div>
                  {schedule.last_sent_at && (
                    <div className="text-xs text-muted-foreground">
                      Last sent: {formatDate(schedule.last_sent_at)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestSend(schedule)}
                    disabled={sendingTest === schedule.id}
                    className="gap-1"
                  >
                    {sendingTest === schedule.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    Test
                  </Button>
                  <Switch
                    checked={schedule.is_active}
                    onCheckedChange={() => handleToggleActive(schedule.id, schedule.is_active)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(schedule.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScheduledReportsCard;
