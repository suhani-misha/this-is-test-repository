import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { XCircle, CheckCircle2, Upload, Loader2, LogOut, Image, Trash2, RefreshCw, Unplug, Calendar, Key, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDateFormat, DateFormatType } from '@/hooks/useDateFormat';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import ScheduledReportsCard from '@/components/ScheduledReportsCard';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';
import PasswordInput from '@/components/PasswordInput';
import { z } from 'zod';

interface Profile {
  id: string;
  full_name: string | null;
  company_name: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_logo_url: string | null;
  date_format: string | null;
  two_factor_enabled: boolean | null;
}

const Settings = () => {
  const { user, signOut } = useAuth();
  const { dateFormat, setDateFormat, formatDate } = useDateFormat();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [selectedDateFormat, setSelectedDateFormat] = useState<DateFormatType>(dateFormat);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [toggling2FA, setToggling2FA] = useState(false);

  // QuickBooks settings
  const [qbClientId, setQbClientId] = useState('');
  const [qbClientSecret, setQbClientSecret] = useState('');
  const [qbRealmId, setQbRealmId] = useState('');
  const [qbConnected, setQbConnected] = useState(false);
  const [qbConnecting, setQbConnecting] = useState(false);
  const [qbLastSync, setQbLastSync] = useState<string | null>(null);

  const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    setSelectedDateFormat(dateFormat);
  }, [dateFormat]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setCompanyName(data.company_name || '');
        setCompanyAddress(data.company_address || '');
        setCompanyPhone(data.company_phone || '');
        setCompanyEmail(data.company_email || '');
        setLogoUrl(data.company_logo_url);
        setTwoFactorEnabled(data.two_factor_enabled || false);
        if (data.date_format) {
          setSelectedDateFormat(data.date_format as DateFormatType);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);

      // Save to profile
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          company_logo_url: publicUrl,
        });

      if (updateError) throw updateError;

      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ company_logo_url: null })
        .eq('id', user.id);

      if (error) throw error;

      setLogoUrl(null);
      toast.success('Logo removed');
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Failed to remove logo');
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          company_name: companyName,
          company_address: companyAddress,
          company_phone: companyPhone,
          company_email: companyEmail,
          company_logo_url: logoUrl,
          date_format: selectedDateFormat,
        });

      if (error) throw error;
      
      // Update the context
      await setDateFormat(selectedDateFormat);
      
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectQuickBooks = async () => {
    if (!qbClientId || !qbClientSecret || !qbRealmId) {
      toast.error('Please fill in all QuickBooks credentials');
      return;
    }

    setQbConnecting(true);
    
    // Simulate QuickBooks OAuth connection
    // In production, this would initiate OAuth flow
    setTimeout(() => {
      setQbConnected(true);
      setQbLastSync(new Date().toLocaleString());
      setQbConnecting(false);
      toast.success('Connected to QuickBooks Online');
    }, 2000);
  };

  const handleDisconnectQuickBooks = () => {
    setQbConnected(false);
    setQbClientId('');
    setQbClientSecret('');
    setQbRealmId('');
    setQbLastSync(null);
    toast.success('Disconnected from QuickBooks');
  };

  const handleRefreshQuickBooks = () => {
    setQbLastSync(new Date().toLocaleString());
    toast.success('QuickBooks connection refreshed');
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/auth');
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    try {
      passwordSchema.parse(newPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password: ' + error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleToggle2FA = async (enabled: boolean) => {
    if (!user) return;

    setToggling2FA(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ two_factor_enabled: enabled })
        .eq('id', user.id);

      if (error) throw error;

      setTwoFactorEnabled(enabled);
      toast.success(enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled');
    } catch (error: any) {
      console.error('Error toggling 2FA:', error);
      toast.error('Failed to update 2FA settings');
    } finally {
      setToggling2FA(false);
    }
  };

  // Sample date for preview
  const sampleDate = new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">System configuration and integrations</p>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Your personal account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email || ''} disabled />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="full-name">Full Name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <PasswordInput
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              minLength={6}
            />
            <PasswordStrengthIndicator password={newPassword} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <PasswordInput
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              minLength={6}
            />
          </div>
          <Button onClick={handleChangePassword} disabled={changingPassword}>
            {changingPassword ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Changing...
              </>
            ) : (
              'Change Password'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email OTP Verification</Label>
              <p className="text-sm text-muted-foreground">
                Receive a verification code via email when signing in
              </p>
            </div>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={handleToggle2FA}
              disabled={toggling2FA}
            />
          </div>
          {twoFactorEnabled && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 inline mr-2 text-green-600" />
              Two-factor authentication is active. You'll receive a 6-digit code via email each time you sign in.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Regional Settings
          </CardTitle>
          <CardDescription>Configure date format for the entire application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date-format">Date Format</Label>
            <Select
              value={selectedDateFormat}
              onValueChange={(value) => setSelectedDateFormat(value as DateFormatType)}
            >
              <SelectTrigger id="date-format" className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dd-MM-yyyy">DD-MM-YYYY (31-12-2024)</SelectItem>
                <SelectItem value="MM-dd-yyyy">MM-DD-YYYY (12-31-2024)</SelectItem>
                <SelectItem value="yyyy-MM-dd">YYYY-MM-DD (2024-12-31)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Preview: <span className="font-medium">{formatDate(sampleDate)}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company Branding</CardTitle>
          <CardDescription>Details shown on invoices, reports, and documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Company Logo</Label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="relative">
                  <img
                    src={logoUrl}
                    alt="Company logo"
                    className="h-20 w-20 object-contain rounded-lg border bg-muted"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={handleRemoveLogo}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50">
                  <Image className="h-8 w-8 text-muted-foreground/50" />
                </div>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Logo
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-name">Company Name</Label>
            <Input
              id="company-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter your company name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-address">Address</Label>
            <Textarea
              id="company-address"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              placeholder="Enter your company address"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-phone">Phone</Label>
              <Input
                id="company-phone"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                placeholder="+1-555-000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-email">Email</Label>
              <Input
                id="company-email"
                type="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                placeholder="info@yourcompany.com"
              />
            </div>
          </div>
          
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>QuickBooks Online Integration</CardTitle>
              <CardDescription>Connect to sync customers, invoices, and payments</CardDescription>
            </div>
            <Badge variant={qbConnected ? 'default' : 'outline'} className={qbConnected ? 'gap-1 bg-success' : 'gap-1'}>
              {qbConnected ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Connected
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                  Not Connected
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="client-id">Client ID</Label>
              <Input 
                id="client-id" 
                placeholder="Enter QuickBooks Client ID" 
                value={qbClientId}
                onChange={(e) => setQbClientId(e.target.value)}
                disabled={qbConnected}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-secret">Client Secret</Label>
              <Input 
                id="client-secret" 
                type="password" 
                placeholder="Enter Client Secret" 
                value={qbClientSecret}
                onChange={(e) => setQbClientSecret(e.target.value)}
                disabled={qbConnected}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="realm-id">Realm ID</Label>
              <Input 
                id="realm-id" 
                placeholder="Enter Company/Realm ID" 
                value={qbRealmId}
                onChange={(e) => setQbRealmId(e.target.value)}
                disabled={qbConnected}
              />
            </div>
          </div>

          {qbConnected && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium">Connection Status</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Last Sync: </span>
                    <span className="font-medium">{qbLastSync}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Environment: </span>
                    <span className="font-medium">Production</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Synced Customers: </span>
                    <span className="font-medium">0</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Synced Invoices: </span>
                    <span className="font-medium">0</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            {qbConnected ? (
              <>
                <Button variant="outline" onClick={handleRefreshQuickBooks} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh Connection
                </Button>
                <Button variant="destructive" onClick={handleDisconnectQuickBooks} className="gap-2">
                  <Unplug className="h-4 w-4" />
                  Disconnect
                </Button>
              </>
            ) : (
              <Button onClick={handleConnectQuickBooks} disabled={qbConnecting}>
                {qbConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect to QuickBooks'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <ScheduledReportsCard />
    </div>
  );
};

export default Settings;
