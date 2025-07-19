'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, CheckCircle, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'

interface InboxNotification {
  id: string
  workspace_id: string
  issue_id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
  read_at: string | null
  issue?: {
    id: string
    title: string
    type: string
  }
}

interface InboxNotificationsProps {
  workspaceId: string
  workspaceSlug: string
}

export function InboxNotifications({ workspaceId, workspaceSlug }: InboxNotificationsProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<InboxNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchNotifications = async () => {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('inbox_notifications')
        .select(`
          *,
          issue:issues!issue_id (
            id,
            title,
            type
          )
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (!error && data) {
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.read).length)
      }
      
      setLoading(false)
    }

    fetchNotifications()

    // Subscribe to real-time updates
    const supabase = createClient()
    const channel = supabase
      .channel(`inbox-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inbox_notifications',
          filter: `workspace_id=eq.${workspaceId}`
        },
        (payload) => {
          if (payload.new) {
            fetchNotifications()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workspaceId])

  const markAsRead = async (notificationId: string) => {
    const supabase = createClient()
    
    await supabase
      .from('inbox_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
    
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId
          ? { ...n, read: true, read_at: new Date().toISOString() }
          : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const dismissNotification = async (notificationId: string) => {
    const supabase = createClient()
    
    await supabase
      .from('inbox_notifications')
      .delete()
      .eq('id', notificationId)
    
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
    const notification = notifications.find(n => n.id === notificationId)
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const handleNotificationClick = async (notification: InboxNotification) => {
    if (!notification.read) {
      await markAsRead(notification.id)
    }
    
    if (notification.issue_id) {
      router.push(`/${workspaceSlug}/issue/${notification.issue_id}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-400">Loading notifications...</div>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No notifications yet</h3>
        <p className="text-gray-500">
          When AI prompts are generated or other updates occur, they&apos;ll appear here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {unreadCount > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
        </div>
      )}
      
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            relative p-4 rounded-lg border transition-all cursor-pointer
            ${notification.read 
              ? 'bg-white border-gray-200 hover:border-gray-300' 
              : 'bg-purple-50 border-purple-200 hover:border-purple-300'
            }
          `}
          onClick={() => handleNotificationClick(notification)}
        >
          <div className="flex items-start gap-3">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center shrink-0
              ${notification.type === 'prompt_ready' 
                ? 'bg-purple-100' 
                : 'bg-gray-100'
              }
            `}>
              {notification.type === 'prompt_ready' ? (
                <Sparkles className="w-5 h-5 text-purple-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-gray-600" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {notification.title}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {notification.message}
                  </p>
                  {notification.issue && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                        {notification.issue.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {notification.issue.title}
                      </span>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    dismissNotification(notification.id)
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </span>
                {!notification.read && (
                  <span className="text-purple-600 font-medium">New</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}