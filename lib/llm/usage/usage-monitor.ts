import { createClient } from '@/lib/supabase/server';

export interface WorkspaceUsage {
  workspaceId: string;
  monthYear: string;
  totalCost: number;
  limit: number;
  limitEnabled: boolean;
  percentageUsed: number;
  isOverLimit: boolean;
}

export class UsageMonitor {
  /**
   * Check if a workspace is under its monthly usage limit
   */
  static async checkWorkspaceQuota(workspaceId: string): Promise<{
    allowed: boolean;
    usage: WorkspaceUsage;
    message?: string;
  }> {
    const supabase = await createClient();
    
    // Get workspace limits
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('usage_limit_monthly, usage_limit_enabled')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspace) {
      throw new Error(`Failed to fetch workspace: ${workspaceError?.message || 'Not found'}`);
    }

    // If limits are disabled, always allow
    if (!workspace.usage_limit_enabled) {
      return {
        allowed: true,
        usage: {
          workspaceId,
          monthYear: new Date().toISOString().slice(0, 7),
          totalCost: 0,
          limit: workspace.usage_limit_monthly,
          limitEnabled: false,
          percentageUsed: 0,
          isOverLimit: false,
        },
      };
    }

    const currentMonthUsage = await this.getWorkspaceUsageForMonth(workspaceId);
    const usage: WorkspaceUsage = {
      workspaceId,
      monthYear: currentMonthUsage.monthYear,
      totalCost: currentMonthUsage.totalCost,
      limit: workspace.usage_limit_monthly,
      limitEnabled: workspace.usage_limit_enabled,
      percentageUsed: (currentMonthUsage.totalCost / workspace.usage_limit_monthly) * 100,
      isOverLimit: currentMonthUsage.totalCost >= workspace.usage_limit_monthly,
    };

    if (usage.isOverLimit) {
      return {
        allowed: false,
        usage,
        message: `Monthly usage limit of $${workspace.usage_limit_monthly} exceeded. Current usage: $${currentMonthUsage.totalCost.toFixed(2)}`,
      };
    }

    return {
      allowed: true,
      usage,
    };
  }

  /**
   * Get workspace usage for a specific month
   */
  static async getWorkspaceUsageForMonth(
    workspaceId: string,
    monthYear?: string
  ): Promise<{ totalCost: number; monthYear: string }> {
    const supabase = await createClient();
    const targetMonth = monthYear || new Date().toISOString().slice(0, 7);

    // Use the database function we created
    const { data, error } = await supabase.rpc('get_workspace_monthly_usage', {
      p_workspace_id: workspaceId,
      p_month_year: targetMonth,
    });

    if (error) {
      console.error('Error fetching workspace usage:', error);
      return { totalCost: 0, monthYear: targetMonth };
    }

    return {
      totalCost: Number(data) || 0,
      monthYear: targetMonth,
    };
  }

  /**
   * Get usage statistics for all workspaces (admin only)
   */
  static async getAllWorkspacesUsage(monthYear?: string): Promise<{
    workspaces: Array<{
      id: string;
      name: string;
      slug: string;
      usage: WorkspaceUsage;
    }>;
    totalUsage: number;
  }> {
    const supabase = await createClient();
    const targetMonth = monthYear || new Date().toISOString().slice(0, 7);

    // Get all workspaces with their usage
    const { data: workspaces, error: workspacesError } = await supabase
      .from('workspaces')
      .select('id, name, slug, usage_limit_monthly, usage_limit_enabled')
      .order('name');

    if (workspacesError || !workspaces) {
      throw new Error(`Failed to fetch workspaces: ${workspacesError?.message}`);
    }

    // Get usage for each workspace
    const workspaceUsagePromises = workspaces.map(async (workspace) => {
      const usage = await this.getWorkspaceUsageForMonth(workspace.id, targetMonth);
      return {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        usage: {
          workspaceId: workspace.id,
          monthYear: targetMonth,
          totalCost: usage.totalCost,
          limit: workspace.usage_limit_monthly,
          limitEnabled: workspace.usage_limit_enabled,
          percentageUsed: (usage.totalCost / workspace.usage_limit_monthly) * 100,
          isOverLimit: usage.totalCost >= workspace.usage_limit_monthly,
        },
      };
    });

    const workspacesWithUsage = await Promise.all(workspaceUsagePromises);
    const totalUsage = workspacesWithUsage.reduce(
      (sum, ws) => sum + ws.usage.totalCost,
      0
    );

    return {
      workspaces: workspacesWithUsage,
      totalUsage,
    };
  }

  /**
   * Update workspace usage limit (admin only)
   */
  static async updateWorkspaceLimit(
    workspaceId: string,
    limit: number,
    enabled: boolean = true
  ): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('workspaces')
      .update({
        usage_limit_monthly: limit,
        usage_limit_enabled: enabled,
      })
      .eq('id', workspaceId);

    if (error) {
      throw new Error(`Failed to update workspace limit: ${error.message}`);
    }
  }

  /**
   * Check if we should send usage alerts
   */
  static async checkUsageAlerts(workspaceId: string): Promise<{
    shouldAlert: boolean;
    percentage: number;
    message?: string;
  }> {
    const { usage } = await this.checkWorkspaceQuota(workspaceId);
    
    if (!usage.limitEnabled) {
      return { shouldAlert: false, percentage: 0 };
    }

    const percentage = usage.percentageUsed;
    
    // Alert at 80%, 90%, and 100%
    if (percentage >= 100) {
      return {
        shouldAlert: true,
        percentage: 100,
        message: 'Your workspace has reached its monthly usage limit.',
      };
    } else if (percentage >= 90) {
      return {
        shouldAlert: true,
        percentage: 90,
        message: 'Your workspace has used 90% of its monthly limit.',
      };
    } else if (percentage >= 80) {
      return {
        shouldAlert: true,
        percentage: 80,
        message: 'Your workspace has used 80% of its monthly limit.',
      };
    }

    return { shouldAlert: false, percentage };
  }
}