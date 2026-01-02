import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import PasswordInput from '@/components/PasswordInput';
import { supabase } from '@/integrations/supabase/client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

type AuthStep = 'credentials' | 'otp';

// Helper to log audit events
const logAuditEvent = async (action: string, entityType: string, entityId?: string) => {
  try {
    await supabase.rpc('log_audit', {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId || null,
      p_old_data: null,
      p_new_data: null,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
};


const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<AuthStep>('credentials');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const { signIn, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const validateInputs = () => {
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        toast.error(e.errors[0].message);
        return false;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        toast.error(e.errors[0].message);
        return false;
      }
    }

    return true;
  };

  const checkTwoFactor = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { email },
      });

      if (error) throw error;

      return data?.twoFactorRequired === true;
    } catch (error) {
      console.error('Error checking 2FA:', error);
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setIsSubmitting(true);
    try {
      // First check if 2FA is enabled and send OTP
      const twoFactorRequired = await checkTwoFactor();

      if (twoFactorRequired) {
        setStep('otp');
        setResendCooldown(60);
        toast.success('Verification code sent to your email');
      } else {
        // No 2FA, proceed with normal sign in
        const { error } = await signIn(email, password);
        if (error) {
          handleSignInError(error);
        } else {
          // Log successful login
          await logAuditEvent('login', 'session');
          toast.success('Welcome back!');
          navigate('/dashboard');
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignInError = (error: Error) => {
    if (error.message.includes('Invalid login credentials')) {
      toast.error('Invalid email or password. Please contact your administrator.');
    } else if (error.message.includes('Email not confirmed')) {
      toast.error('Your account is not confirmed. Please contact your administrator.');
    } else {
      toast.error(error.message);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      // Verify OTP
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { email, otp },
      });

      if (error || !data?.verified) {
        toast.error(data?.error || 'Invalid or expired verification code');
        return;
      }

      // OTP verified, now sign in
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        handleSignInError(signInError);
      } else {
        // Log successful login with 2FA
        await logAuditEvent('login', 'session');
        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    try {
      const { error } = await supabase.functions.invoke('send-otp', {
        body: { email },
      });

      if (error) throw error;

      setResendCooldown(60);
      toast.success('New verification code sent');
    } catch (error) {
      toast.error('Failed to resend code');
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setOtp('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center">
              <Package className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">CargoClear</CardTitle>
          <CardDescription>Freight & Customs Management System</CardDescription>
          {step === 'credentials' && (
            <p className="text-xs text-muted-foreground mt-2">
              Internal access only. Contact your administrator for credentials.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {step === 'credentials' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <PasswordInput
                  id="login-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  We sent a verification code to
                </p>
                <p className="font-medium">{email}</p>
              </div>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  disabled={isVerifying}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                onClick={handleVerifyOtp}
                className="w-full"
                disabled={isVerifying || otp.length !== 6}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Sign In'
                )}
              </Button>
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToCredentials}
                  className="gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
