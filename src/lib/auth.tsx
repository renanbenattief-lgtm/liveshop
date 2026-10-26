import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from './supabase'
import type { Profile, Store } from './types'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  store: Store | null
  loading: boolean
  isAdmin: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); setStore(null); return }
    const [{ data: p }, { data: st }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle(),
      supabase.from('stores').select('*').eq('owner_id', s.user.id).maybeSingle(),
    ])
    setProfile((p as Profile) ?? null)
    setStore((st as Store) ?? null)
  }, [])

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); return }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await load(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      // adia para fora do callback para evitar deadlock do supabase-js
      setTimeout(() => { load(s) }, 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [load])

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    profile,
    store,
    loading,
    isAdmin: profile?.role === 'admin',
    refresh: () => load(session),
    signOut: async () => { await supabase.auth.signOut() },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}
