import { Link } from 'react-router-dom'
import { CalendarClock, MapPin, Truck, Zap } from 'lucide-react'
import type { LiveResult, Product, StoreResult } from '@/lib/types'
import { OnAir, Price, Rating, StoreAvatar } from './ui'
import { money, whenLabel, shippingLabel } from '@/lib/format'

/** Card de live: uma "tela ligada" vertical com a loja, o produto em destaque e o preço. */
export function LiveCard({ live }: { live: LiveResult; highlight?: string }) {
  const isLive = live.status === 'live'
  const free = shippingLabel(live)
  return (
    <Link to={`/live/${live.live_id}`} className="group block">
      <div className={`screen relative aspect-[9/14] overflow-hidden rounded-[22px] bg-ink-700 ${isLive ? '' : 'opacity-90'}`}>
        {live.cover_url && (
          <img src={live.cover_url} alt="" loading="lazy" className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${isLive ? '' : 'grayscale-[40%]'}`} />
        )}
        <div className="absolute inset-x-0 top-0 h-24 shade-t" />
        <div className="absolute inset-x-0 bottom-0 h-3/4 shade-b" />

        <div className="absolute left-2.5 top-2.5 right-2.5 flex items-start justify-between gap-2">
          {isLive ? <OnAir viewers={live.viewers_count} small /> : (
            <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-ink/80 text-[11px] font-semibold text-mist">
              <CalendarClock size={12} /> {whenLabel(live.scheduled_at)}
            </span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="flex items-center gap-2 mb-2">
            <StoreAvatar name={live.store_name} url={live.store_logo} size={26} ring={isLive} />
            <span className="text-sm font-semibold truncate">{live.store_name}</span>
          </div>
          <p className="font-display font-bold leading-tight text-[15px] line-clamp-2 mb-2">{live.title}</p>
          {live.featured && (
            <div className="flex items-center gap-2 rounded-2xl bg-ink/75 backdrop-blur p-1.5 pr-2.5">
              {live.featured.image && <img src={live.featured.image} alt="" className="h-9 w-9 rounded-xl object-cover" loading="lazy" />}
              <div className="min-w-0">
                <p className="text-[11px] text-mist-300 truncate">{live.featured.name}</p>
                <Price price={live.featured.price} promo={live.featured.promo_price} size="sm" hideOld />
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-2 text-[11px] text-mist-300">
            <span className="inline-flex items-center gap-0.5"><MapPin size={11} />{live.store_city}/{live.store_state}</span>
            {free && <span className="inline-flex items-center gap-0.5 text-cool"><Truck size={11} />Frete grátis</span>}
            {live.fast_delivery && <span className="inline-flex items-center gap-0.5 text-tag"><Zap size={11} />48h</span>}
          </div>
        </div>
      </div>
    </Link>
  )
}

export function StoreRow({ s }: { s: StoreResult }) {
  return (
    <Link to={`/loja/${s.slug}`} className="card flex gap-3 p-3 hover:border-ink-500 transition-colors">
      <div className="relative h-24 w-24 rounded-2xl overflow-hidden bg-ink-700 shrink-0">
        {s.sample_image && <img src={s.sample_image} alt="" className="h-full w-full object-cover" loading="lazy" />}
        {s.is_live && <span className="absolute left-1 top-1"><OnAir small /></span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <StoreAvatar name={s.name} url={s.logo_url} size={22} />
          <span className="font-semibold truncate">{s.name}</span>
        </div>
        <p className="text-sm text-mist-400 mt-1">
          {s.matched_products} {s.matched_products === 1 ? 'produto' : 'produtos'} a partir de <span className="text-tag font-semibold">{money(s.min_price)}</span>
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-mist-400">
          <Rating value={s.rating} />
          <span>{s.city}/{s.state}</span>
          {s.next_live_at && !s.is_live && <span className="text-tag inline-flex items-center gap-1"><CalendarClock size={12} /> live {whenLabel(s.next_live_at)}</span>}
        </div>
      </div>
    </Link>
  )
}

export function ProductTile({ p, onClick }: { p: Product; onClick?: () => void }) {
  const img = [...(p.product_images ?? [])].sort((a, b) => a.position - b.position)[0]?.url
  const body = (
    <>
      <div className="aspect-square rounded-2xl overflow-hidden bg-ink-700">
        {img && <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />}
      </div>
      <p className="text-sm mt-2 line-clamp-2 leading-snug">{p.name}</p>
      <Price price={p.price} promo={p.promo_price} size="sm" />
    </>
  )
  return onClick
    ? <button onClick={onClick} className="text-left flex flex-col w-full self-start">{body}</button>
    : <Link to={`/produto/${p.id}`} className="block">{body}</Link>
}

export function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">{children}</div>
}
