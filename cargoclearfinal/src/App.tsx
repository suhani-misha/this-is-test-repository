import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { RoleProvider } from "./contexts/RoleContext";
import { DateFormatProvider } from "./contexts/DateFormatContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/DashboardLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerForm from "./pages/CustomerForm";
import Fees from "./pages/Fees";
import FeeForm from "./pages/FeeForm";
import Jobs from "./pages/Jobs";
import JobForm from "./pages/JobForm";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import Payments from "./pages/Payments";
import PaymentForm from "./pages/PaymentForm";
import ReportsMenu from "./pages/ReportsMenu";
import RevenueReport from "./pages/reports/RevenueReport";
import OutstandingReport from "./pages/reports/OutstandingReport";
import JobStatusReport from "./pages/reports/JobStatusReport";
import CustomerAnalysisReport from "./pages/reports/CustomerAnalysisReport";
import StatementOfAccount from "./pages/reports/StatementOfAccount";
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import EmailTemplates from "./pages/EmailTemplates";
import AuditLogs from "./pages/AuditLogs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <RoleProvider>
          <DateFormatProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Customers />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers/new"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <CustomerForm />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers/:id"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <CustomerForm />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fees"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Fees />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fees/new"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <FeeForm />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fees/:id"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <FeeForm />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Jobs />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/new"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <JobForm />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:id"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <JobForm />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Invoices />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices/:id"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <InvoiceDetail />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/payments"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Payments />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/payments/new"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <PaymentForm />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ReportsMenu />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/revenue"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <RevenueReport />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/outstanding"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <OutstandingReport />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/jobs"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <JobStatusReport />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/customers"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <CustomerAnalysisReport />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/statement"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <StatementOfAccount />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Settings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <UserManagement />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/templates"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <EmailTemplates />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <AuditLogs />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </DateFormatProvider>
        </RoleProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
