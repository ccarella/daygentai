'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TestApiKey() {
  const [data, setData] = useState<{ loading: boolean; user?: unknown; fullWorkspace?: unknown; apiKeyOnly?: unknown; isOwner?: boolean }>({ loading: true });

  useEffect(() => {
    const test = async () => {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Try different queries
      const results: { user?: unknown; fullWorkspace?: unknown; apiKeyOnly?: unknown; isOwner?: boolean } = { user };
      
      // Query 1: Just get workspace
      const { data: ws1, error: e1 } = await supabase
        .from('workspaces')
        .select('*')
        .limit(1)
        .single();
      results.fullWorkspace = { data: ws1, error: e1 };
      
      // Query 2: Just api_key
      const { data: ws2, error: e2 } = await supabase
        .from('workspaces')
        .select('id, name, api_key')
        .limit(1)
        .single();
      results.apiKeyOnly = { data: ws2, error: e2 };
      
      // Query 3: Check if it's owner
      if (ws1) {
        results.isOwner = user?.id === ws1.owner_id;
      }
      
      setData({ loading: false, ...results });
    };
    
    test();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Key Test Page</h1>
      <pre className="bg-gray-100 p-4 rounded overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
      <div className="mt-4 text-sm text-gray-600">
        <p>Check the browser console for additional logs from the CreateIssueModal</p>
      </div>
    </div>
  );
}