'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MoreHorizontal, Trash2, Edit3 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useIssueCache } from '@/contexts/issue-cache-context';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { EditIssueModal } from './edit-issue-modal';
import { PromptDisplay } from './prompt-display';
const typeIcons = {
    feature: '✨',
    bug: '🐛',
    chore: '🔧',
    design: '🎨',
    'non-technical': '📝'
};
const priorityColors = {
    critical: 'text-red-600 bg-red-50',
    high: 'text-orange-600 bg-orange-50',
    medium: 'text-yellow-600 bg-yellow-50',
    low: 'text-green-600 bg-green-50'
};
const priorityLabels = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low'
};
const statusOptions = [
    { value: 'todo', label: 'Todo', color: 'text-gray-600' },
    { value: 'in_progress', label: 'In Progress', color: 'text-yellow-600' },
    { value: 'in_review', label: 'In Review', color: 'text-purple-600' },
    { value: 'done', label: 'Done', color: 'text-green-600' },
];
const typeOptions = [
    { value: 'feature', label: 'Feature', icon: '✨' },
    { value: 'bug', label: 'Bug', icon: '🐛' },
    { value: 'chore', label: 'Chore', icon: '🔧' },
    { value: 'design', label: 'Design', icon: '🎨' },
    { value: 'non-technical', label: 'Non-technical', icon: '📝' },
];
export function IssueDetails({ issueId, onBack, onDeleted }) {
    var _a, _b, _c, _d;
    const { getIssue } = useIssueCache();
    const [issue, setIssue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [creatorName, setCreatorName] = useState('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isUpdatingType, setIsUpdatingType] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    useEffect(() => {
        const fetchIssue = async () => {
            var _a;
            // Check cache first
            const cachedIssue = getIssue(issueId);
            if (cachedIssue) {
                setIssue(cachedIssue);
                setCreatorName(((_a = cachedIssue.creator) === null || _a === void 0 ? void 0 : _a.name) || '');
                setLoading(false);
                return;
            }
            // If not in cache, fetch from database
            setLoading(true);
            const supabase = createClient();
            // Fetch issue data
            const { data: issue, error } = await supabase
                .from('issues')
                .select('*')
                .eq('id', issueId)
                .single();
            if (error || !issue) {
                onBack();
                return;
            }
            setIssue(issue);
            // Fetch creator name
            const { data: creator } = await supabase
                .from('users')
                .select('name')
                .eq('id', issue.created_by)
                .single();
            if (creator) {
                setCreatorName(creator.name);
            }
            setLoading(false);
        };
        fetchIssue();
    }, [issueId, onBack, getIssue]);
    const handleDelete = async () => {
        if (!issue)
            return;
        const confirmed = window.confirm('Are you sure you want to delete this issue?');
        if (!confirmed)
            return;
        const supabase = createClient();
        const { error } = await supabase
            .from('issues')
            .delete()
            .eq('id', issue.id);
        if (!error) {
            onDeleted();
        }
    };
    const handleStatusChange = async (newStatus) => {
        if (!issue || isUpdatingStatus)
            return;
        setIsUpdatingStatus(true);
        const supabase = createClient();
        const { error } = await supabase
            .from('issues')
            .update({ status: newStatus })
            .eq('id', issue.id);
        if (!error) {
            setIssue(Object.assign(Object.assign({}, issue), { status: newStatus }));
        }
        setIsUpdatingStatus(false);
    };
    const handleTypeChange = async (newType) => {
        if (!issue || isUpdatingType)
            return;
        setIsUpdatingType(true);
        const supabase = createClient();
        const { error } = await supabase
            .from('issues')
            .update({ type: newType })
            .eq('id', issue.id);
        if (!error) {
            setIssue(Object.assign(Object.assign({}, issue), { type: newType }));
        }
        setIsUpdatingType(false);
    };
    const handleEdit = () => {
        setIsEditModalOpen(true);
    };
    
    const handleIssueUpdated = async () => {
        // Refresh the issue data after update
        const supabase = createClient();
        const { data: updatedIssue } = await supabase
            .from('issues')
            .select('*')
            .eq('id', issueId)
            .single();
        
        if (updatedIssue) {
            setIssue(updatedIssue);
        }
    };
    if (loading) {
        return (<div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading issue...</div>
      </div>);
    }
    if (!issue) {
        return null;
    }
    return (<div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header with back button */}
        <div className="mb-6">
          <button onClick={onBack} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            Back to issues
          </button>
        </div>

        {/* Issue Content */}
        <div className="space-y-6">
          {/* Title and Actions */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <span className="text-2xl">{typeIcons[issue.type]}</span>
              <h1 className="text-2xl font-semibold text-gray-900">{issue.title}</h1>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreHorizontal className="w-5 h-5 text-gray-500"/>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit3 className="w-4 h-4 mr-2"/>
                  Edit issue
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                  <Trash2 className="w-4 h-4 mr-2"/>
                  Delete issue
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Metadata */}
          <div className="flex items-center space-x-4 text-sm">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[issue.priority]}`}>
              {priorityLabels[issue.priority]}
            </span>
            <span className="text-gray-500">
              Created by {creatorName} {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500 text-sm">Status:</span>
              <Select value={issue.status} onValueChange={handleStatusChange} disabled={isUpdatingStatus}>
                <SelectTrigger className="h-7 w-auto border-0 p-0 hover:bg-gray-100 focus:ring-0 focus:ring-offset-0">
                  <SelectValue>
                    <span className={`text-sm font-medium ${((_a = statusOptions.find(s => s.value === issue.status)) === null || _a === void 0 ? void 0 : _a.color) || 'text-gray-600'}`}>
                      {((_b = statusOptions.find(s => s.value === issue.status)) === null || _b === void 0 ? void 0 : _b.label) || issue.status}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (<SelectItem key={status.value} value={status.value}>
                      <span className={status.color}>{status.label}</span>
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500 text-sm">Type:</span>
              <Select value={issue.type} onValueChange={handleTypeChange} disabled={isUpdatingType}>
                <SelectTrigger className="h-7 w-auto border-0 p-0 hover:bg-gray-100 focus:ring-0 focus:ring-offset-0">
                  <SelectValue>
                    <span className="text-sm font-medium flex items-center gap-1">
                      <span>{((_c = typeOptions.find(t => t.value === issue.type)) === null || _c === void 0 ? void 0 : _c.icon) || '📌'}</span>
                      <span>{((_d = typeOptions.find(t => t.value === issue.type)) === null || _d === void 0 ? void 0 : _d.label) || issue.type}</span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((type) => (<SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </span>
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* AI Generated Prompt */}
          {issue.generated_prompt && (
            <PromptDisplay prompt={issue.generated_prompt} className="mt-6" />
          )}

          {/* Description */}
          {issue.description ? (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {issue.description}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-gray-500 italic">No description provided</p>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 my-8"></div>

          {/* Activity Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Activity</h2>
            
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <p className="text-gray-500 text-sm">Activity timeline coming soon...</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit Issue Modal */}
      <EditIssueModal 
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        issue={issue}
        onIssueUpdated={handleIssueUpdated}
      />
    </div>);
}
