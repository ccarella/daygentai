'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface InboxBadgeProps {
  workspaceId: string
}

export function InboxBadge({ workspaceId }: InboxBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchUnreadCount = async () => {
      const supabase = createClient()
      
      const { count } = await supabase
        .from('inbox_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('read', false)
      
      setUnreadCount(count || 0)
    }

    fetchUnreadCount()

    // Subscribe to real-time updates
    const supabase = createClient()
    const channel = supabase
      .channel(`inbox-badge-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inbox_notifications',
          filter: `workspace_id=eq.${workspaceId}`
        },
        () => {
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workspaceId])

  if (unreadCount === 0) {
    return null
  }

  return (
    <span className="ml-auto bg-purple-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )
}