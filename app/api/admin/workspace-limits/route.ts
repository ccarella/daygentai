import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/admin-check';
import { UsageMonitor } from '@/lib/llm/usage/usage-monitor';

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    await requireAdmin();
    
    // Parse request body
    const body = await request.json();
    const { workspaceId, limit, enabled } = body;
    
    if (!workspaceId || typeof limit !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }
    
    // Update workspace limit
    await UsageMonitor.updateWorkspaceLimit(workspaceId, limit, enabled);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating workspace limit:', error);
    
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