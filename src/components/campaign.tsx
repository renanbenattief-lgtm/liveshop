import { Link } from 'react-router-dom'
import { Radio, Store } from 'lucide-react'
import { type Campaign, campaignWhen, inkOn } from '@/lib/campaigns'

/** Banner da campanha: a cor da data comanda o visual. */
export function CampaignBanner({ c, compact }: { c: Campaign; compact?: boolean }) {
  const ink = inkOn(c.color)
  return (
    <Link to={`/campanha/${c.slug}`} className="relative block overflow-hidden rounded-[26px]" style={{ background: c.color, color: ink }}>
      {c.banner_url && (
        <img src={c.banner_url} alt="" loading="lazy" className="absolute inset-y-0 right-0 h-full w-2/3 object-cover"
          style={{ maskImage: 'linear-gradient(to right, transparent, black 45%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 45%)' }} />
      )}
      <div className={`relative ${compact ? 'p-4 pr-24' : 'p-5 md:p-8 pr-28 md:pr-[40%]'}`}>
        <p className="text-xs font-semibold opacity-80">{c.is_running ? 'Campanha no ar' : 'Em breve'} · {campaignWhen(c)}</p>
        <h3 className={`font-display font-extrabold leading-[1.05] mt-1 ${compact ? 'text-xl' : 'text-3xl md:text-5xl'}`}>{c.name}</h3>
        {c.tagline && !compact && <p className="mt-1.5 opacity-90 max-w-md">{c.tagline}</p>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-sm font-semibold">
          <span className="font-display">#{c.hashtag}</span>
          {!!c.lives_now && <span className="inline-flex items-center gap-1"><Radio size={14} /> {c.lives_now} ao vivo</span>}
          {!!c.stores_count && <span className="inline-flex items-center gap-1 opacity-80"><Store size={14} /> {c.stores_count} lojas</span>}
        </div>
      </div>
    </Link>
  )
}
