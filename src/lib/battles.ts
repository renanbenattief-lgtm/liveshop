import { supabase } from './supabase'
import { must } from './useAsync'

export type BattleStatus = 'invited' | 'scheduled' | 'live' | 'ended' | 'declined' | 'cancelled'

export interface Battle {
  id: string
  title: string
  status: BattleStatus
  host_store_id: string
  unit_price: number
  unit_cost: number
  commission_percent: number
  goal_units: number | null
  goal_reward: string | null
  terms_version: number
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
  cover_url: string | null
  created_at: string
}

export interface BattleParticipant {
  battle_id: string
  store_id: string
  role: 'host' | 'guest'
  product_id: string | null
  stock_declared: number | null
  declared_cost: number | null
  terms_version: number | null
  terms_accepted_at: string | null
  units_sold: number
  refunded_amount: number
  shipping_paid: number
  stores?: { id: string; name: string; slug: string; logo_url: string | null; city: string; state: string; rating: number; owner_id: string | null }
  products?: { id: string; name: string; price: number; promo_price: number | null; stock: number; product_images?: { url: string; position: number }[] } | null
}

export interface PublicBattle {
  battle_id: string
  title: string
  status: BattleStatus
  scheduled_at: string | null
  unit_price: number
  goal_units: number | null
  goal_reward: string | null
  cover_url: string | null
  units_total: number
  stores: { id: string; name: string; slug: string; logo: string | null; city: string; state: string; role: 'host' | 'guest' }[]
}

export const BATTLE_STATUS: Record<BattleStatus, string> = {
  invited: 'Convite pendente',
  scheduled: 'Agendada',
  live: 'Ao vivo',
  ended: 'Encerrada',
  declined: 'Recusada',
  cancelled: 'Cancelada',
}

export const PARTICIPANT_SELECT = '*, stores(id, name, slug, logo_url, city, state, rating, owner_id), products(id, name, price, promo_price, stock, product_images(url, position))'

export async function getTerms(version?: number) {
  const q = supabase.from('battle_terms').select('*')
  const r = version ? await q.eq('version', version).single() : await q.order('version', { ascending: false }).limit(1).single()
  return must(r) as { version: number; body: string }
}

export interface SplitLine { units: number; gross: number; costBack: number; shippingBack: number; share: number; payout: number }
export interface SplitResult { lines: SplitLine[]; gross: number; commission: number; cost: number; shipping: number; refunds: number; profit: number }

/**
 * Mesma conta da função battle_split do banco:
 * comissão sai primeiro, cada loja recebe o custo das peças e o frete que ela pagou,
 * e o lucro que sobra é dividido igualmente.
 */
export function splitBattle(price: number, cost: number, commissionPct: number, units: number[], shipping: number[] = [], refunds: number[] = []): SplitResult {
  const n = units.length
  const gross = units.reduce((a, u) => a + u * price, 0)
  const costT = units.reduce((a, u) => a + u * cost, 0)
  const shipT = shipping.reduce((a, s) => a + (s || 0), 0)
  const refT = refunds.reduce((a, s) => a + (s || 0), 0)
  const commission = Math.round((gross - refT) * commissionPct) / 100
  const profit = gross - refT - commission - costT - shipT
  const share = n ? Math.round((profit / n) * 100) / 100 : 0
  const lines = units.map((u, i) => {
    const costBack = u * cost
    const shippingBack = shipping[i] || 0
    return { units: u, gross: u * price, costBack, shippingBack, share, payout: costBack + shippingBack + share }
  })
  return { lines, gross, commission, cost: costT, shipping: shipT, refunds: refT, profit }
}
