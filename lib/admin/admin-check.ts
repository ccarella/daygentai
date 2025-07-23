import { createClient } from '@/lib/supabase/server';

// For now, hardcode admin emails. Later this can be moved to a database table or env vars
const ADMIN_EMAILS = process.env['ADMIN_EMAILS']?.split(',') || [
  // Add your admin emails here
];

export async function isAdmin(userId?: string | null): Promise<boolean> {
  if (!userId) return false;
  
  const supabase = await createClient();
  
  // Get current user to check if it matches and has email
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user?.id === userId && user.email) {
    return ADMIN_EMAILS.includes(user.email);
  }
  
  return false;
}

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || !(await isAdmin(user.id))) {
    throw new Error('Unauthorized: Admin access required');
  }
  
  return user;
}