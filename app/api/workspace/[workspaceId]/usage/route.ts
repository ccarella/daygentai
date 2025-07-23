import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UsageMonitor } from '@/lib/llm/usage/usage-monitor';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await context.params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user has access to this workspace
    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();
      
    if (!member) {
      // Check if user is the owner
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .single();
        
      if (!workspace || workspace.owner_id !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
    }
    
    // Get usage data
    const { usage } = await UsageMonitor.checkWorkspaceQuota(workspaceId);
    
    return NextResponse.json({ usage });
  } catch (error) {
    console.error('Error fetching workspace usage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}