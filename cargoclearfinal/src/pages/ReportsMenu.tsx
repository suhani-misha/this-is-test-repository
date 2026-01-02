import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, DollarSign, AlertCircle, BarChart3, Users, ClipboardList } from 'lucide-react';

const ReportsMenu = () => {
  const navigate = useNavigate();

  const reports = [
    {
      title: 'Revenue Collection Report',
      description: 'Monthly revenue analysis and collection rates',
      icon: DollarSign,
      path: '/reports/revenue',
      color: 'text-success',
    },
    {
      title: 'Outstanding Payments Report',
      description: 'Aging analysis and pending customer payments',
      icon: AlertCircle,
      path: '/reports/outstanding',
      color: 'text-warning',
    },
    {
      title: 'Job Status Report',
      description: 'Job processing status and completion analysis',
      icon: FileText,
      path: '/reports/jobs',
      color: 'text-primary',
    },
    {
      title: 'Customer Analysis Report',
      description: 'Customer performance and payment behavior',
      icon: Users,
      path: '/reports/customers',
      color: 'text-accent',
    },
    {
      title: 'Statement of Account',
      description: 'Complete transaction history for a customer',
      icon: ClipboardList,
      path: '/reports/statement',
      color: 'text-blue-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Select a report to view detailed analysis</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <Card
            key={report.path}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate(report.path)}
          >
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg bg-muted ${report.color}`}>
                  <report.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="mb-2">{report.title}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ReportsMenu;
