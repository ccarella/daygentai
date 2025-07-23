import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function AdminNotConfigured() {
  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <CardTitle>Admin Access Not Configured</CardTitle>
          </div>
          <CardDescription>
            No admin emails have been configured for this application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">To enable admin access:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Add the <code className="px-1 py-0.5 bg-background rounded">ADMIN_EMAILS</code> environment variable</li>
              <li>Set it to a comma-separated list of admin email addresses</li>
              <li>Example: <code className="px-1 py-0.5 bg-background rounded">ADMIN_EMAILS=&quot;admin1@example.com,admin2@example.com&quot;</code></li>
              <li>Restart your application for changes to take effect</li>
            </ol>
          </div>
          
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-yellow-900 dark:text-yellow-100">
              <strong>Security Note:</strong> Only add trusted email addresses to the admin list. 
              Admin users have access to sensitive usage data and can modify workspace limits.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}