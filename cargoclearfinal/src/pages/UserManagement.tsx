import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { UserPlus, Shield, User, Loader2, Trash2, Mail, Key } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/contexts/RoleContext';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';
import PasswordInput from '@/components/PasswordInput';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'user' | null;
  created_at: string;
}

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

const UserManagement = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useRole();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const [inviteForm, setInviteForm] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'user' as 'admin' | 'user',
  });

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/dashboard');
      return;
    }
    
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, roleLoading, navigate]);

  const fetchUsers = async () => {
    try {
      // Fetch profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, created_at');

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Create a map of user_id to role
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      // Combine the data - we'll use profiles as the base
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => ({
        id: profile.id,
        email: '', // We don't have access to auth.users email directly
        full_name: profile.full_name,
        role: roleMap.get(profile.id) as 'admin' | 'user' | null,
        created_at: profile.created_at,
      }));

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    try {
      emailSchema.parse(inviteForm.email);
      passwordSchema.parse(inviteForm.password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    if (!inviteForm.fullName.trim()) {
      toast.error('Please enter a full name');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create user using Supabase Admin API via edge function
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: inviteForm.email,
          password: inviteForm.password,
          fullName: inviteForm.fullName,
          role: inviteForm.role,
        },
      });

      if (error) throw error;

      toast.success(`User ${inviteForm.email} created successfully!`);
      setIsInviteDialogOpen(false);
      setInviteForm({ email: '', password: '', fullName: '', role: 'user' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      toast.success('User role updated successfully');
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role: ' + error.message);
    }
  };

  const openResetPasswordDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setResetPassword('');
    setConfirmResetPassword('');
    setIsResetPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    try {
      passwordSchema.parse(resetPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    if (resetPassword !== confirmResetPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: {
          userId: selectedUser.id,
          newPassword: resetPassword,
        },
      });

      if (error) throw error;

      toast.success(`Password reset for ${selectedUser.full_name || 'user'}`);
      setIsResetPasswordDialogOpen(false);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password: ' + error.message);
    } finally {
      setIsResetting(false);
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage users and their roles</p>
        </div>
        <Button onClick={() => setIsInviteDialogOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            All users in the system with their assigned roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found. Add your first user to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {user.role === 'admin' ? (
                        <Shield className="h-5 w-5 text-primary" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{user.full_name || 'No name'}</h3>
                      <p className="text-sm text-muted-foreground">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openResetPasswordDialog(user)}
                      className="gap-1"
                    >
                      <Key className="h-3 w-3" />
                      Reset Password
                    </Button>
                    <Select
                      value={user.role || 'user'}
                      onValueChange={(value) => handleChangeRole(user.id, value as 'admin' | 'user')}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Admin
                          </div>
                        </SelectItem>
                        <SelectItem value="user">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            User
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role || 'No role'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account for your organization. They will be able to log in immediately.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={inviteForm.fullName}
                onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                placeholder="John Doe"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="user@company.com"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Temporary Password *</Label>
              <PasswordInput
                id="password"
                value={inviteForm.password}
                onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                placeholder="Strong password required"
                required
                disabled={isSubmitting}
                minLength={8}
              />
              <PasswordStrengthIndicator password={inviteForm.password} showRequirements={true} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value) => setInviteForm({ ...inviteForm, role: value as 'admin' | 'user' })}
                disabled={isSubmitting}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      User - Standard access
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admin - Full access
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsInviteDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Create User
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {selectedUser?.full_name || 'this user'}. They will need to use this new password to log in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">New Password *</Label>
              <PasswordInput
                id="reset-password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="At least 6 characters"
                disabled={isResetting}
                minLength={6}
              />
              <PasswordStrengthIndicator password={resetPassword} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-reset-password">Confirm Password *</Label>
              <PasswordInput
                id="confirm-reset-password"
                value={confirmResetPassword}
                onChange={(e) => setConfirmResetPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={isResetting}
                minLength={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)} disabled={isResetting}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={isResetting} className="gap-2">
              {isResetting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4" />
                  Reset Password
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
