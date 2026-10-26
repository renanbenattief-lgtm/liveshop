import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from './supabase'
import { useAuth } from './auth'

/** Seguir/deixar de seguir loja. Pede login se necessário. */
export function useFollow(storeId: string | undefined) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [following, setFollowing] = useState(false)
  const [reminder, setReminder] = useState(false)

  useEffect(() => {
    if (!user || !storeId) return
    supabase.from('store_followers').select('store_id').eq('user_id', user.id).eq('store_id', storeId).maybeSingle()
      .then(({ data }) => setFollowing(!!data))
    supabase.from('live_reminders').select('id').eq('user_id', user.id).eq('store_id', storeId).is('live_id', null).maybeSingle()
      .then(({ data }) => setReminder(!!data))
  }, [user, storeId])

  const needLogin = useCallback(() => {
    toast('Entre na sua conta para continuar')
    navigate(`/entrar?next=${encodeURIComponent(location.pathname)}`)
  }, [navigate, location.pathname])

  const toggleFollow = async () => {
    if (!user) return needLogin()
    if (!storeId) return
    if (following) {
      setFollowing(false)
      await supabase.from('store_followers').delete().eq('user_id', user.id).eq('store_id', storeId)
    } else {
      setFollowing(true)
      const { error } = await supabase.from('store_followers').insert({ user_id: user.id, store_id: storeId })
      if (error) { setFollowing(false); toast.error(error.message) } else toast.success('Você está seguindo esta loja')
    }
  }

  const toggleReminder = async () => {
    if (!user) return needLogin()
    if (!storeId) return
    if (reminder) {
      setReminder(false)
      await supabase.from('live_reminders').delete().eq('user_id', user.id).eq('store_id', storeId).is('live_id', null)
      toast('Lembrete desativado')
    } else {
      setReminder(true)
      const { error } = await supabase.from('live_reminders').insert({ user_id: user.id, store_id: storeId })
      if (error) { setReminder(false); toast.error(error.message) } else toast.success('Vamos te avisar quando a loja entrar ao vivo')
    }
  }

  return { following, toggleFollow, reminder, toggleReminder }
}
