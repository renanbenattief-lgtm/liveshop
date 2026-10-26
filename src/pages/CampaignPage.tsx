import { Link, useParams } from 'react-router-dom'
import { CalendarRange, Percent } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { must, useAsync } from '@/lib/useAsync'
import { searchLives } from '@/lib/api'
import { type Campaign, campaignRange, campaignWhen, currentCampaigns, inkOn } from '@/lib/campaigns'
import { CardGrid, LiveCard } from '@/components/cards'
import { Empty, Spinner, StoreAvatar } from '@/components/ui'
import { CampaignBanner } from '@/components/campaign'

export default function CampaignPage() {
  const { slug } = useParams()
  const { data, loading } = useAsync(async () => {
    const c = must(await supabase.from('campaigns').select('*').eq('slug', slug!).maybeSingle()) as Campaign | null
    if (!c) return null
    const [lives, stores, others] = await Promise.all([
      searchLives({ q: `#${c.hashtag}` }, null, 60),
      supabase.from('campaign_stores').select('stores(id, name, slug, logo_url, city, state)').eq('campaign_id', c.id).then(must),
      currentCampaigns(6),
    ])
    const storeList = (stores as unknown as { stores: { id: string; name: string; slug: string; logo_url: string | null; city: string; state: string } | null }[])
      .map((s) => s.stores).filter(Boolean) as { id: string; name: string; slug: string; logo_url: string | null; city: string; state: string }[]
    return { c, lives, stores: storeList, others: others.filter((o) => o.id !== c.id) }
  }, [slug])

  if (loading) return <Spinner />
  if (!data) return <Empty title="Campanha não encontrada" action={<Link to="/" className="btn btn-primary">Voltar para o início</Link>} />
  const { c, lives, stores, others } = data
  const ink = inkOn(c.color)
  const running = Date.now() >= new Date(c.starts_at).getTime() && Date.now() <= new Date(c.ends_at).getTime()
  const liveNow = lives.filter((l) => l.status === 'live')
  const next = lives.filter((l) => l.status === 'scheduled')

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <header className="relative overflow-hidden md:mx-6 md:mt-6 md:rounded-[32px]" style={{ background: c.color, color: ink }}>
        {c.banner_url && <img src={c.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />}
        <div className="relative px-4 md:px-10 pt-8 pb-7 md:py-14">
          <p className="text-sm font-semibold opacity-80">{running ? 'Campanha no ar' : 'Em breve'} · {campaignWhen(c)}</p>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.02] mt-1 max-w-3xl">{c.name}</h1>
          {c.tagline && <p className="text-lg mt-2 opacity-90 max-w-2xl">{c.tagline}</p>}
          <div className="flex flex-wrap gap-2 mt-4 text-sm font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 h-8" style={{ background: ink === '#FFFFFF' ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.55)' }}><CalendarRange size={15} /> {campaignRange(c)}</span>
            {c.min_discount_percent && <span className="inline-flex items-center gap-1.5 rounded-full px-3 h-8" style={{ background: ink === '#FFFFFF' ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.55)' }}><Percent size={15} /> Descontos a partir de {c.min_discount_percent}%</span>}
            <Link to={`/buscar?q=%23${c.hashtag}`} className="inline-flex items-center rounded-full px-3 h-8 font-display" style={{ background: ink === '#FFFFFF' ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.55)' }}>#{c.hashtag}</Link>
          </div>
        </div>
      </header>

      <div className="px-4 md:px-6">
        {c.description && <p className="text-mist-300 mt-5 max-w-2xl">{c.description}</p>}

        <section className="mt-8">
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-onair animate-pulsedot" /> Ao vivo na campanha</h2>
          {liveNow.length ? <CardGrid>{liveNow.map((l) => <LiveCard key={l.live_id} live={l} />)}</CardGrid> : (
            <Empty title={running ? 'Nenhuma loja da campanha ao vivo agora' : 'A campanha ainda não começou'}>
              {running ? 'Siga as lojas abaixo para ser avisado quando entrarem ao vivo.' : `As lives começam ${campaignRange(c).split(' a ')[0]}.`}
            </Empty>
          )}
        </section>

        {next.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-bold mb-3">Próximas lives da campanha</h2>
            <CardGrid>{next.map((l) => <LiveCard key={l.live_id} live={l} />)}</CardGrid>
          </section>
        )}

        {stores.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-bold mb-3">Lojas participantes ({stores.length})</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {stores.map((s) => (
                <li key={s.id}>
                  <Link to={`/loja/${s.slug}`} className="card flex items-center gap-3 p-3 hover:border-ink-500">
                    <StoreAvatar name={s.name} url={s.logo_url} size={40} />
                    <span className="min-w-0"><span className="block font-semibold truncate">{s.name}</span><span className="block text-xs text-mist-400">{s.city}/{s.state}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {others.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold mb-3">Outras campanhas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{others.map((o) => <CampaignBanner key={o.id} c={o} compact />)}</div>
          </section>
        )}
      </div>
    </div>
  )
}
