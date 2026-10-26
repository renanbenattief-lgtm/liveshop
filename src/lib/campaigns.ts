import { supabase } from './supabase'
import { must } from './useAsync'

export interface Campaign {
  id: string
  name: string
  slug: string
  tagline: string | null
  description: string | null
  hashtag: string
  color: string
  banner_url: string | null
  starts_at: string
  ends_at: string
  min_discount_percent: number | null
  active?: boolean
  is_running?: boolean
  stores_count?: number
  lives_now?: number
}

export async function currentCampaigns(limit = 6) {
  return must(await supabase.rpc('current_campaigns', { p_limit: limit })) as Campaign[]
}

/** Texto escuro ou claro conforme a cor da campanha. */
export function inkOn(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#140D26' : '#FFFFFF'
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')

export function campaignWhen(c: Pick<Campaign, 'starts_at' | 'ends_at'>) {
  const now = Date.now()
  const start = new Date(c.starts_at).getTime()
  const end = new Date(c.ends_at).getTime()
  if (now < start) {
    const days = Math.ceil((start - now) / 86400000)
    return days <= 1 ? `Começa amanhã` : `Começa em ${days} dias · ${fmt(c.starts_at)}`
  }
  const left = Math.ceil((end - now) / 86400000)
  return left <= 1 ? 'Último dia' : `Até ${fmt(c.ends_at)} · faltam ${left} dias`
}

export const campaignRange = (c: Pick<Campaign, 'starts_at' | 'ends_at'>) => `${fmt(c.starts_at)} a ${fmt(c.ends_at)}`
