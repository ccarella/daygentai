'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ApiKeyDebug({ workspaceId }) {
  const [debugInfo, setDebugInfo] = useState({
    loading: true,
    user: null,
    workspace: null,
    error: null,
    hasApiKey: false
  });

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const supabase = createClient();
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          setDebugInfo(prev => ({ ...prev, error: `User error: ${userError.message}` }));
          return;
        }

        // Get workspace with all fields
        const { data: workspace, error: wsError } = await supabase
          .from('workspaces')
          .select('*')
          .eq('id', workspaceId)
          .single();

        if (wsError) {
          setDebugInfo(prev => ({ ...prev, error: `Workspace error: ${wsError.message}` }));
          return;
        }

        setDebugInfo({
          loading: false,
          user: {
            id: user?.id,
            email: user?.email
          },
          workspace: {
            id: workspace?.id,
            name: workspace?.name,
            owner_id: workspace?.owner_id,
            hasApiKey: !!(workspace?.api_key),
            apiKeyLength: workspace?.api_key?.length,
            api_provider: workspace?.api_provider
          },
          error: null,
          hasApiKey: !!(workspace?.api_key),
          ownerMatch: user?.id === workspace?.owner_id
        });

      } catch (error) {
        setDebugInfo(prev => ({ ...prev, error: error.message, loading: false }));
      }
    };

    if (workspaceId) {
      checkApiKey();
    }
  }, [workspaceId]);

  return (
    <div className="fixed bottom-4 right-4 bg-white border shadow-lg rounded-lg p-4 max-w-md text-xs">
      <h3 className="font-bold mb-2">API Key Debug Info</h3>
      <pre className="text-xs overflow-auto">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
}