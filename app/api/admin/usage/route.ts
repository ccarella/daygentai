import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/admin-check';
import { UsageMonitor } from '@/lib/llm/usage/usage-monitor';

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    await requireAdmin();
    
    // Get month from query params
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    
    // Get all workspaces usage
    const usageData = await UsageMonitor.getAllWorkspacesUsage(month);
    
    return NextResponse.json(usageData);
  } catch (error) {
    console.error('Error in admin usage API:', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}