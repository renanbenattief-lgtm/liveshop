import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { must, useAsync } from '@/lib/useAsync'
import { PRODUCT_SELECT } from '@/lib/api'
import { elapsed, money, whenLabel } from '@/lib/format'
import type { Product } from '@/lib/types'
import { type Battle, type BattleParticipant, PARTICIPANT_SELECT } from '@/lib/battles'
import { Empty, OnAir, Spinner, StoreAvatar } from '@/components/ui'
import { BattleBadge, GoalBar } from '@/components/battle'
import { BuySheet } from '@/components/BuySheet'

/** Página da Batalha do Bem: tela dividida, meta conjunta e compra de qualquer um dos lados. */
export default function BattlePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [buy, setBuy] = useState<Product | null>(null)

  const { data, loading, setData } = useAsync(async () => {
    const battle = must(await supabase.from('battles').select('*').eq('id', id!).maybeSingle()) as Battle | null
    if (!battle) return null
    const parts = must(await supabase.from('battle_participants').select(PARTICIPANT_SELECT).eq('battle_id', id!)) as BattleParticipant[]
    parts.sort((a, b) => (a.role === 'host' ? -1 : 1) - (b.role === 'host' ? -1 : 1))
    const ids = parts.map((p) => p.product_id).filter(Boolean) as string[]
    const products = ids.length ? must(await supabase.from('products').select(PRODUCT_SELECT).in('id', ids)) as Product[] : []
    return { battle, parts, products }
  }, [id])

  // placar e status em tempo real
  useEffect(() => {
    if (!id) return
    const ch = supabase.channel(`battle-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'battles', filter: `id=eq.${id}` }, (p) =>
        setData((d) => (d ? { ...d, battle: { ...d.battle, ...(p.new as Battle) } } : d)))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'battle_participants', filter: `battle_id=eq.${id}` }, (p) =>
        setData((d) => (d ? { ...d, parts: d.parts.map((x) => (x.store_id === (p.new as BattleParticipant).store_id ? { ...x, ...(p.new as BattleParticipant) } : x)) } : d)))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [id, setData])

  if (loading) return <div className="min-h-screen"><Spinner /></div>
  if (!data) return <Empty title="Batalha não encontrada" action={<Link to="/" className="btn btn-primary">Voltar para o início</Link>} />

  const { battle, parts, products } = data
  const isLive = battle.status === 'live'
  const total = parts.reduce((a, p) => a + p.units_sold, 0)

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: battle.title, text: 'Batalha do Bem no LIVESHOP', url })
      else { await navigator.clipboard.writeText(url); toast.success('Link copiado') }
    } catch { /* cancelado */ }
  }

  return (
    <div className="h-[100dvh] md:h-auto md:min-h-screen flex flex-col bg-ink-900 md:p-6">
      <div className="relative flex-1 flex flex-col md:flex-row md:max-w-5xl md:mx-auto md:w-full md:h-[calc(100vh-48px)] md:rounded-[28px] overflow-hidden">
        {/* topo */}
        <div className="absolute top-0 inset-x-0 z-20 p-3 pt-[max(12px,env(safe-area-inset-top))] flex items-center gap-2">
          <button onClick={() => (history.length > 1 ? navigate(-1) : navigate('/'))} className="h-10 w-10 rounded-full bg-ink/60 backdrop-blur inline-flex items-center justify-center" aria-label="Voltar"><ArrowLeft size={18} /></button>
          <BattleBadge />
          <span className="ml-auto flex items-center gap-2">
            {isLive && <OnAir />}
            <button onClick={share} className="h-10 w-10 rounded-full bg-ink/60 backdrop-blur inline-flex items-center justify-center" aria-label="Compartilhar"><Share2 size={17} /></button>
          </span>
        </div>

        {parts.map((p, i) => {
          const prod = products.find((x) => x.id === p.product_id)
          const img = [...(prod?.product_images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? battle.cover_url
          const color = i === 0 ? 'bg-tag text-ink' : 'bg-cool text-ink'
          return (
            <section key={p.store_id} className="relative flex-1 min-h-0 overflow-hidden" aria-label={p.stores?.name}>
              <div className="screen absolute inset-0">{img && <img src={img} alt="" className={`h-full w-full object-cover ${isLive ? '' : 'opacity-60'}`} />}</div>
              {/* no celular a loja de cima fica com os controles no topo e a de baixo embaixo, livres da faixa central */}
              <div className={`absolute inset-x-0 top-0 ${i === 0 ? 'h-1/2 md:h-28' : 'h-20'} shade-t`} />
              <div className={`absolute inset-x-0 bottom-0 ${i === 0 ? 'h-20 md:h-2/3' : 'h-2/3'} shade-b`} />
              <div className={`absolute inset-x-0 p-3 ${i === 0
                ? 'top-[calc(max(12px,env(safe-area-inset-top))+52px)] md:top-auto md:bottom-0'
                : 'bottom-0 pb-[max(12px,env(safe-area-inset-bottom))]'}`}>
                <Link to={`/loja/${p.stores?.slug}`} className="inline-flex items-center gap-2 rounded-full bg-ink/60 backdrop-blur pl-1 pr-3 py-1 mb-2 max-w-full">
                  <StoreAvatar name={p.stores?.name ?? '?'} url={p.stores?.logo_url} size={28} />
                  <span className="text-sm font-semibold truncate">{p.stores?.name}</span>
                  <span className="text-[11px] text-mist-300 shrink-0">{p.stores?.city}/{p.stores?.state}</span>
                </Link>
                <div className="flex items-center gap-2">
                  <span className={`h-11 min-w-11 px-3 rounded-full inline-flex items-center justify-center font-display font-extrabold ${color}`} aria-label={`${p.units_sold} vendas`}>{p.units_sold}</span>
                  <span className="text-sm text-mist-300 flex-1 min-w-0 truncate">{prod?.name}</span>
                  {prod && (isLive
                    ? <button onClick={() => setBuy(prod)} className="btn btn-primary btn-sm h-11 shrink-0">Comprar aqui</button>
                    : <Link to={`/loja/${p.stores?.slug}`} className="btn btn-ghost btn-sm h-11 shrink-0">Ver loja</Link>)}
                </div>
              </div>
            </section>
          )
        })}

        {/* faixa central: título, preço e meta conjunta */}
        <div className="absolute z-10 inset-x-3 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[380px] rounded-[22px] bg-ink/85 backdrop-blur border border-white/10 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-display font-bold leading-tight truncate">{battle.title}</p>
            <span className="font-display font-extrabold text-tag shrink-0">{money(battle.unit_price)}</span>
          </div>
          <p className="text-xs text-mist-400 mb-2">
            {isLive ? `Ao vivo ${elapsed(battle.started_at)} · ` : battle.status === 'scheduled' ? `Começa ${whenLabel(battle.scheduled_at)} · ` : battle.status === 'ended' ? 'Encerrada · ' : ''}
            Mesmo produto, mesmo preço. Compre de qualquer lado: o lucro é dividido igualmente.
          </p>
          {battle.goal_units
            ? <GoalBar units={total} goal={battle.goal_units} reward={battle.goal_reward} split={parts.map((p) => p.units_sold)} />
            : <p className="text-sm font-semibold">{total} vendidos juntos</p>}
        </div>
      </div>
      <BuySheet product={buy} onClose={() => setBuy(null)} />
    </div>
  )
}
