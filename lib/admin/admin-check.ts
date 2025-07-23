import { createClient } from '@/lib/supabase/server';

// Parse admin emails from environment variable, trim whitespace
const ADMIN_EMAILS_RAW = process.env['ADMIN_EMAILS']
  ?.split(',')
  .map(email => email.trim())
  .filter(email => email.length > 0) || [];

// Validate admin configuration
function getAdminEmails(): string[] {
  if (ADMIN_EMAILS_RAW.length === 0) {
    console.warn('[Admin Check] No admin emails configured. Set ADMIN_EMAILS environment variable.');
  }
  return ADMIN_EMAILS_RAW;
}

export async function isAdmin(userId?: string | null): Promise<boolean> {
  if (!userId) return false;
  
  const adminEmails = getAdminEmails();
  
  // If no admins configured, log warning and deny access
  if (adminEmails.length === 0) {
    console.warn('[Admin Check] Admin access denied - no admin emails configured');
    return false;
  }
  
  const supabase = await createClient();
  
  // Get current user to check if it matches and has email
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user?.id === userId && user.email) {
    return adminEmails.includes(user.email);
  }
  
  return false;
}

export async function requireAdmin() {
  const adminEmails = getAdminEmails();
  
  // If no admins configured, throw specific error
  if (adminEmails.length === 0) {
    throw new Error('Admin access not configured. Set ADMIN_EMAILS environment variable.');
  }
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || !(await isAdmin(user.id))) {
    throw new Error('Unauthorized: Admin access required');
  }
  
  return user;
}