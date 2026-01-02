import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  FileText,
  Receipt,
  CreditCard,
  BarChart3,
  Settings,
  Package,
  Shield,
  Mail,
  History,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

const menuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Customers', url: '/customers', icon: Users },
  { title: 'Fee Master', url: '/fees', icon: DollarSign },
  { title: 'Job Sheets', url: '/jobs', icon: FileText },
  { title: 'Invoices', url: '/invoices', icon: Receipt },
  { title: 'Payments', url: '/payments', icon: CreditCard },
  { title: 'Reports', url: '/reports', icon: BarChart3 },
  { title: 'Settings', url: '/settings', icon: Settings },
];

const adminMenuItems = [
  { title: 'User Management', url: '/admin/users', icon: Shield },
  { title: 'Email Templates', url: '/settings/templates', icon: Mail },
  { title: 'Audit Logs', url: '/admin/audit-logs', icon: History },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { user, signOut } = useAuth();
  const { role, isAdmin } = useRole();
  const navigate = useNavigate();
  const collapsed = state === 'collapsed';

  const handleLogout = async () => {
    // Log logout event before signing out
    try {
      await supabase.rpc('log_audit', {
        p_action: 'logout',
        p_entity_type: 'session',
        p_entity_id: null,
        p_old_data: null,
        p_new_data: null,
      });
    } catch (error) {
      console.error('Failed to log logout event:', error);
    }
    
    await signOut();
    toast.success('Signed out successfully');
    navigate('/auth');
  };

  return (
    <Sidebar className={collapsed ? 'w-14' : 'w-64'} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && <span className="font-bold text-lg">CargoClear</span>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className="hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-4 space-y-2">
          {!collapsed && user && (
            <div className="text-sm space-y-1">
              <p className="font-medium truncate">{user.email}</p>
              {role && (
                <Badge variant={isAdmin ? 'default' : 'secondary'} className="text-xs">
                  {isAdmin ? 'Admin' : 'User'}
                </Badge>
              )}
            </div>
          )}
          <Button
            variant="outline"
            size={collapsed ? 'icon' : 'default'}
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
