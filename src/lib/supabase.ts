import { createClient } from '@supabase/supabase-js'

// Chave pública (publishable): pode ficar no código. As variáveis de ambiente, se existirem, têm prioridade.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://cvcqxxstwrlxjboxtcfk.supabase.co'
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || 'sb_publishable_dpSem7Coqgh7wVGed1Le2w_z4aIco3D'

export const supabaseConfigured = Boolean(url && key)

export const supabase = createClient(url ?? 'https://placeholder.supabase.co', key ?? 'placeholder', {
  auth: { persistSession: true, autoRefreshToken: true },
})
