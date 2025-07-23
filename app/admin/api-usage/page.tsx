import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin/admin-check';
import AdminDashboard from '@/components/admin/admin-dashboard';

export default async function AdminApiUsagePage() {
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