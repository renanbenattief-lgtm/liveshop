import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { supabase } from './supabase'
import { useAuth } from './auth'

export interface AppNotification {
  id: string
  type: 'live_started' | 'battle_live' | 'campaign_started' | 'new_follower'
  title: string
  body: string | null
  link: string | null
  image_url: string | null
  created_at: string
  read_at: string | null
}

interface Ctx { unread: number; refresh: () => void; markAllRead: () => Promise<void> }
const NotificationsContext = createContext<Ctx>({ unread: 0, refresh: () => {}, markAllRead: async () => {} })

/** Conta avisos não lidos e escuta novos em tempo real (mostra um toast quando chega). */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  const refresh = useCallback(async () => {
    if (!user) { setUnread(0); return }
    const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null)
    setUnread(count ?? 0)
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (!user) return
    const ch = supabase.channel(`notifications-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (p) => {
        const n = p.new as AppNotification
        setUnread((u) => u + 1)
        toast(n.title, {
          description: n.body ?? undefined,
          action: n.link ? { label: 'Abrir', onClick: () => { window.location.href = n.link! } } : undefined,
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user])

  const markAllRead = useCallback(async () => {
    await supabase.rpc('mark_notifications_read')
    setUnread(0)
  }, [])

  return <NotificationsContext.Provider value={{ unread, refresh, markAllRead }}>{children}</NotificationsContext.Provider>
}

export const useNotifications = () => useContext(NotificationsContext)
