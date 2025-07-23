'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, RefreshCw } from 'lucide-react';
import { WorkspaceUsage } from '@/lib/llm/usage/usage-monitor';

interface WorkspaceWithUsage {
  id: string;
  name: string;
  slug: string;
  usage: WorkspaceUsage;
}

export default function AdminDashboard() {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithUsage[]>([]);
  const [totalUsage, setTotalUsage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [editingLimits, setEditingLimits] = useState<Record<string, { limit: number; enabled: boolean }>>({});

  useEffect(() => {
    fetchUsageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const fetchUsageData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/usage?month=${selectedMonth}`);
      if (!response.ok) throw new Error('Failed to fetch usage data');
      
      const data = await response.json();
      setWorkspaces(data.workspaces);
      setTotalUsage(data.totalUsage);
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateWorkspaceLimit = async (workspaceId: string) => {
    const limits = editingLimits[workspaceId];
    if (!limits) return;

    try {
      const response = await fetch('/api/admin/workspace-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          limit: limits.limit,
          enabled: limits.enabled,
        }),
      });

      if (!response.ok) throw new Error('Failed to update limit');
      
      // Clear editing state and refresh
      setEditingLimits(prev => {
        const newState = { ...prev };
        delete newState[workspaceId];
        return newState;
      });
      fetchUsageData();
    } catch (error) {
      console.error('Error updating workspace limit:', error);
    }
  };

  const exportToCSV = () => {
    const headers = ['Workspace', 'Usage ($)', 'Limit ($)', 'Percentage', 'Status'];
    const rows = workspaces.map(ws => [
      ws.name,
      ws.usage.totalCost.toFixed(2),
      ws.usage.limit.toFixed(2),
      ws.usage.percentageUsed.toFixed(1) + '%',
      ws.usage.isOverLimit ? 'Over Limit' : 'Active',
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-usage-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">API Usage Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage workspace API usage</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getMonthOptions().map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={fetchUsageData} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Usage</CardTitle>
            <CardDescription>All workspaces combined</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalUsage.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Workspaces</CardTitle>
            <CardDescription>Workspaces with usage this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {workspaces.filter(ws => ws.usage.totalCost > 0).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Over Limit</CardTitle>
            <CardDescription>Workspaces exceeding their limit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {workspaces.filter(ws => ws.usage.isOverLimit).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Usage Details</CardTitle>
          <CardDescription>
            Manage individual workspace limits and monitor usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>
              {loading ? 'Loading...' : `Showing usage for ${workspaces.length} workspaces`}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Limit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspaces.map(workspace => {
                const editing = editingLimits[workspace.id];
                return (
                  <TableRow key={workspace.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{workspace.name}</div>
                        <div className="text-sm text-muted-foreground">/{workspace.slug}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>${workspace.usage.totalCost.toFixed(2)}</span>
                          <span className="text-muted-foreground">
                            {workspace.usage.percentageUsed.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={workspace.usage.percentageUsed} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      {editing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editing.limit}
                            onChange={(e) => setEditingLimits(prev => ({
                              ...prev,
                              [workspace.id]: { ...editing, limit: parseFloat(e.target.value) || 0 }
                            }))}
                            className="w-20"
                            step="0.01"
                          />
                          <Switch
                            checked={editing.enabled}
                            onCheckedChange={(enabled) => setEditingLimits(prev => ({
                              ...prev,
                              [workspace.id]: { ...editing, enabled }
                            }))}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>${workspace.usage.limit.toFixed(2)}</span>
                          {!workspace.usage.limitEnabled && (
                            <Badge variant="outline">Disabled</Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {workspace.usage.isOverLimit ? (
                        <Badge variant="destructive">Over Limit</Badge>
                      ) : workspace.usage.percentageUsed >= 80 ? (
                        <Badge variant="secondary">Warning</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editing ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => updateWorkspaceLimit(workspace.id)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingLimits(prev => {
                              const newState = { ...prev };
                              delete newState[workspace.id];
                              return newState;
                            })}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingLimits(prev => ({
                            ...prev,
                            [workspace.id]: {
                              limit: workspace.usage.limit,
                              enabled: workspace.usage.limitEnabled,
                            }
                          }))}
                        >
                          Edit Limit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}