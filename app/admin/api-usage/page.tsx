import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin/admin-check';
import AdminDashboard from '@/components/admin/admin-dashboard';
import AdminNotConfigured from '@/components/admin/admin-not-configured';

export default async function AdminApiUsagePage() {
  // Check if admin emails are configured
  const hasAdminConfig = process.env['ADMIN_EMAILS']?.trim();
  
  if (!hasAdminConfig) {
    return <AdminNotConfigured />;
  }
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/');
  }
  
  const isUserAdmin = await isAdmin(user.id);
  if (!isUserAdmin) {
    redirect('/');
  }
  
  return <AdminDashboard />;
}