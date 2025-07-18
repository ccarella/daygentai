'use client';
import { createContext, useContext, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
const IssueCacheContext = createContext(undefined);
export function IssueCacheProvider({ children }) {
    const [cache, setCache] = useState(new Map());
    const [loadingIssues, setLoadingIssues] = useState(new Set());
    const getIssue = useCallback((issueId) => {
        return cache.get(issueId) || null;
    }, [cache]);
    const preloadIssue = useCallback(async (issueId) => {
        // Skip if already cached or currently loading
        if (cache.has(issueId) || loadingIssues.has(issueId)) {
            return;
        }
        setLoadingIssues(prev => new Set(prev).add(issueId));
        try {
            const supabase = createClient();
            // Fetch issue
            const { data: issue, error } = await supabase
                .from('issues')
                .select('*')
                .eq('id', issueId)
                .single();
            if (!error && issue) {
                setCache(prev => new Map(prev).set(issueId, issue));
            }
        }
        catch (error) {
            console.error('Error preloading issue:', error);
        }
        finally {
            setLoadingIssues(prev => {
                const newSet = new Set(prev);
                newSet.delete(issueId);
                return newSet;
            });
        }
    }, [cache, loadingIssues]);
    const preloadIssues = useCallback(async (issueIds) => {
        // Filter out already cached or loading issues
        const issuesToLoad = issueIds.filter(id => !cache.has(id) && !loadingIssues.has(id));
        if (issuesToLoad.length === 0)
            return;
        // Mark all issues as loading
        setLoadingIssues(prev => {
            const newSet = new Set(prev);
            issuesToLoad.forEach(id => newSet.add(id));
            return newSet;
        });
        try {
            const supabase = createClient();
            // Batch fetch all issues
            const { data: issues, error } = await supabase
                .from('issues')
                .select('*')
                .in('id', issuesToLoad);
            if (!error && issues) {
                setCache(prev => {
                    const newCache = new Map(prev);
                    issues.forEach(issue => {
                        newCache.set(issue.id, issue);
                    });
                    return newCache;
                });
            }
        }
        catch (error) {
            console.error('Error preloading issues:', error);
        }
        finally {
            setLoadingIssues(prev => {
                const newSet = new Set(prev);
                issuesToLoad.forEach(id => newSet.delete(id));
                return newSet;
            });
        }
    }, [cache, loadingIssues]);
    const clearCache = useCallback(() => {
        setCache(new Map());
    }, []);
    return (<IssueCacheContext.Provider value={{ getIssue, preloadIssue, preloadIssues, clearCache }}>
      {children}
    </IssueCacheContext.Provider>);
}
export function useIssueCache() {
    const context = useContext(IssueCacheContext);
    if (!context) {
        throw new Error('useIssueCache must be used within an IssueCacheProvider');
    }
    return context;
}
