import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Handshake } from 'lucide-react'
import { money, whenLabel as whenLabelSafe } from '@/lib/format'
import { OnAir, StoreAvatar } from './ui'
import { splitBattle, type BattleStatus, BATTLE_STATUS } from '@/lib/battles'

export function BattleBadge({ small }: { small?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-full bg-cool text-ink font-bold ${small ? 'h-6 px-2 text-[11px]' : 'h-7 px-2.5 text-xs'}`}>
      <Handshake size={small ? 12 : 14} /> Batalha do Bem
    </span>
  )
}

export function BattleStatusPill({ status }: { status: BattleStatus }) {
  const cls: Record<BattleStatus, string> = {
    invited: 'bg-tag/15 text-tag', scheduled: 'bg-cool/15 text-cool', live: 'bg-onair text-white',
    ended: 'bg-ink-600 text-mist-300', declined: 'bg-ink-600 text-mist-400', cancelled: 'bg-ink-600 text-mist-400',
  }
  return <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap ${cls[status]}`}>{BATTLE_STATUS[status]}</span>
}

/** Barra da meta conjunta: as duas lojas enchem a mesma barra. */
export function GoalBar({ units, goal, reward, split }: { units: number; goal: number | null; reward?: string | null; split?: number[] }) {
  if (!goal) return null
  const pct = Math.min(100, (units / goal) * 100)
  const done = units >= goal
  const total = split?.reduce((a, b) => a + b, 0) || 0
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm mb-1.5">
        <span className="font-semibold">{done ? 'Meta batida!' : 'Meta das duas lojas'}</span>
        <span className="font-display font-bold">{units}<span className="text-mist-400 font-sans font-medium">/{goal}</span></span>
      </div>
      <div className="h-3 rounded-full bg-ink-600 overflow-hidden flex" role="progressbar" aria-valuenow={units} aria-valuemax={goal}>
        {split && total > 0
          ? split.map((s, i) => <span key={i} className={i === 0 ? 'bg-tag' : 'bg-cool'} style={{ width: `${(s / total) * pct}%` }} />)
          : <span className="bg-tag" style={{ width: `${pct}%` }} />}
      </div>
      {reward && <p className={`text-xs mt-1.5 ${done ? 'text-cool font-semibold' : 'text-mist-400'}`}>{done ? 'Liberado: ' : 'Ao bater a meta: '}{reward}</p>}
    </div>
  )
}

/** Simulador do extrato: mostra que o lucro final de cada loja sai igual. */
export function SplitSimulator({ price, cost, commission, names, initialUnits = [60, 20] }: { price: number; cost: number; commission: number; names: string[]; initialUnits?: number[] }) {
  const [units, setUnits] = useState<number[]>(names.map((_, i) => initialUnits[i] ?? 10))
  const [freight, setFreight] = useState<number[]>(names.map(() => 0))
  const r = splitBattle(price, cost, commission, units, freight)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {names.map((n, i) => (
          <div key={i} className="rounded-2xl bg-ink-700/60 p-3">
            <p className="text-sm font-semibold truncate mb-2">{n}</p>
            <label className="block text-xs text-mist-400 mb-1">Vendas</label>
            <input type="number" min={0} inputMode="numeric" value={units[i]} className="input h-10 mb-2"
              onChange={(e) => setUnits(units.map((u, j) => (j === i ? Math.max(0, parseInt(e.target.value) || 0) : u)))} />
            <label className="block text-xs text-mist-400 mb-1">Frete que pagou (R$)</label>
            <input type="number" min={0} inputMode="decimal" value={freight[i]} className="input h-10"
              onChange={(e) => setFreight(freight.map((u, j) => (j === i ? Math.max(0, Number(e.target.value) || 0) : u)))} />
          </div>
        ))}
      </div>
      <SplitTable names={names} r={r} />
    </div>
  )
}

export function SplitTable({ names, r }: { names: string[]; r: ReturnType<typeof splitBattle> }) {
  const rows: [string, (i: number) => string, string?][] = [
    ['Vendas', (i) => String(r.lines[i].units)],
    ['Custo devolvido', (i) => money(r.lines[i].costBack)],
    ['Frete devolvido', (i) => money(r.lines[i].shippingBack)],
    ['Metade do lucro', (i) => money(r.lines[i].share)],
    ['Recebe no total', (i) => money(r.lines[i].payout), 'font-bold text-mist'],
    ['Lucro final', (i) => money(r.lines[i].share), 'font-bold text-cool'],
  ]
  return (
    <div className="text-sm">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3 text-mist-300">
        <dt>Total vendido</dt><dd className="text-right text-mist">{money(r.gross)}</dd>
        {r.refunds > 0 && <><dt>Devoluções</dt><dd className="text-right">− {money(r.refunds)}</dd></>}
        <dt>Comissão LIVESHOP</dt><dd className="text-right">− {money(r.commission)}</dd>
        <dt>Custo das peças</dt><dd className="text-right">− {money(r.cost)}</dd>
        <dt>Frete total</dt><dd className="text-right">− {money(r.shipping)}</dd>
        <dt className="font-semibold text-mist">Lucro para dividir</dt><dd className="text-right font-semibold text-mist">{money(r.profit)}</dd>
      </dl>
      <div className="grid grid-cols-2 gap-2">
        {names.map((n, i) => (
          <div key={i} className={`rounded-2xl bg-ink-700/50 p-3 border-t-4 ${i === 0 ? 'border-t-tag' : 'border-t-cool'}`}>
            <p className="font-semibold truncate mb-2">{n}</p>
            <dl className="space-y-1.5">
              {rows.map(([label, fn, cls]) => (
                <div key={label}>
                  <dt className="text-[11px] text-mist-400 leading-none">{label}</dt>
                  <dd className={`tabular-nums ${cls ?? ''}`}>{fn(i)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TermsBox({ body, accepted, onChange }: { body: string; accepted: boolean; onChange: (v: boolean) => void }) {
  return (
    <div>
      <div className="max-h-64 overflow-y-auto rounded-2xl bg-ink-900 border border-ink-600 p-4 text-sm text-mist-300 whitespace-pre-line leading-relaxed" tabIndex={0} aria-label="Termo da batalha">
        {body}
      </div>
      <label className="flex items-start gap-3 mt-3 cursor-pointer">
        <input type="checkbox" checked={accepted} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5 accent-[#FFD23F] shrink-0" />
        <span className="text-sm">Li e aceito o termo. Declaro que o custo do produto informado é verdadeiro e concordo em dividir o lucro em partes iguais.</span>
      </label>
    </div>
  )
}

/** Card de batalha para a home: duas lojas lado a lado e a meta conjunta. */
export function BattleCard({ b }: { b: import('@/lib/battles').PublicBattle }) {
  const [a, c] = b.stores
  const live = b.status === 'live'
  return (
    <Link to={`/batalha/${b.battle_id}`}
      className="block rounded-[22px] bg-ink-800 border border-ink-700 overflow-hidden hover:border-ink-500 transition-colors">
      <div className="relative h-32">
        {b.cover_url && <img src={b.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
        <div className="absolute inset-0 shade-b" />
        <div className="absolute left-2.5 top-2.5 flex gap-1.5"><BattleBadge small />{live && <OnAirSmall />}</div>
        <div className="absolute left-3 bottom-2.5 flex items-center gap-1.5">
          {a && <Avatar name={a.name} url={a.logo} />}
          <span className="font-display font-extrabold text-tag text-lg">x</span>
          {c && <Avatar name={c.name} url={c.logo} />}
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display font-bold leading-tight truncate">{b.title}</p>
          <span className="font-display font-extrabold text-tag shrink-0">{money(b.unit_price)}</span>
        </div>
        <p className="text-sm text-mist-300 mt-0.5 truncate">{a?.name} x {c?.name}</p>
        <p className="text-xs text-mist-400">{live ? `${b.units_total} vendidos juntos` : `Começa ${whenLabelSafe(b.scheduled_at)}`}</p>
        {b.goal_units && live && <div className="mt-2"><GoalBar units={b.units_total} goal={b.goal_units} reward={b.goal_reward} /></div>}
      </div>
    </Link>
  )
}

const OnAirSmall = () => <OnAir small />
const Avatar = ({ name, url }: { name: string; url: string | null }) => <StoreAvatar name={name} url={url} size={32} />
