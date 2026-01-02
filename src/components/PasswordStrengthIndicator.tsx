import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

type Strength = 'weak' | 'medium' | 'strong';

interface PasswordCheck {
  label: string;
  met: boolean;
}

const getPasswordStrength = (password: string): { strength: Strength; score: number; checks: PasswordCheck[] } => {
  const checks: PasswordCheck[] = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'One number (0-9)', met: /[0-9]/.test(password) },
    { label: 'One special character (!@#$%^&*)', met: /[^a-zA-Z0-9]/.test(password) },
  ];

  const score = checks.filter(c => c.met).length;

  let strength: Strength = 'weak';
  if (score >= 4) strength = 'medium';
  if (score >= 5) strength = 'strong';

  return { strength, score, checks };
};

const PasswordStrengthIndicator = ({ password, showRequirements = true }: PasswordStrengthIndicatorProps) => {
  const { strength, score, checks } = useMemo(() => getPasswordStrength(password), [password]);
  
  if (!password) return null;
  
  const strengthConfig = {
    weak: {
      label: 'Weak',
      color: 'bg-destructive',
      textColor: 'text-destructive',
      bars: 1,
    },
    medium: {
      label: 'Medium',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bars: 2,
    },
    strong: {
      label: 'Strong',
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bars: 3,
    },
  };
  
  const config = strengthConfig[strength];
  
  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((bar) => (
          <div
            key={bar}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              bar <= config.bars ? config.color : 'bg-muted'
            )}
          />
        ))}
      </div>
      <p className={cn('text-xs font-medium', config.textColor)}>
        Password strength: {config.label}
      </p>
      {showRequirements && (
        <div className="space-y-1">
          {checks.map((check, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              {check.met ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <X className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={cn(check.met ? 'text-green-600' : 'text-muted-foreground')}>
                {check.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;
