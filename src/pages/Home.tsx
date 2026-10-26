import { Link, useNavigate } from 'react-router-dom'
import { useState, type FormEvent } from 'react'
import { Search, Store } from 'lucide-react'
import { CardGrid, LiveCard } from '@/components/cards'
import { Empty, ErrorBox, Logo, Spinner } from '@/components/ui'
import { CategoryIcon } from '@/components/CategoryIcon'
import { getCategories, searchLives, trendingTags } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import type { PublicBattle } from '@/lib/battles'
import { BattleCard } from '@/components/battle'
import { CampaignBanner } from '@/components/campaign'
import { currentCampaigns } from '@/lib/campaigns'
import { useAsync } from '@/lib/useAsync'
import { useAuth } from '@/lib/auth'
import { BellButton } from '@/pages/Notifications'
import { compact } from '@/lib/format'

export default function Home() {
  const navigate = useNavigate()
  const { store, user } = useAuth()
  const [q, setQ] = useState('')
  const { data, loading, error } = useAsync(async () => {
    const [lives, tags, cats, battles, campaigns] = await Promise.all([
      searchLives({}, null, 60), trendingTags(14), getCategories(),
      supabase.rpc('public_battles', { p_limit: 8 }).then((r) => (r.data ?? []) as PublicBattle[]),
      currentCampaigns(4).catch(() => []),
    ])
    return { lives, tags, cats, battles, campaigns }
  }, [])

  const live = data?.lives.filter((l) => l.status === 'live') ?? []
  const next = data?.lives.filter((l) => l.status === 'scheduled') ?? []
  const viewers = live.reduce((a, l) => a + l.viewers_count, 0)

  const submit = (e: FormEvent) => { e.preventDefault(); navigate(`/buscar?q=${encodeURIComponent(q)}`) }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Topo: a pergunta é o produto */}
      <section className="px-4 md:px-6 pt-5 md:pt-10 pb-6">
        <div className="flex items-center justify-between md:hidden mb-6">
          <Logo />
          <span className="flex items-center gap-2">
            {user && <BellButton />}
            <Link to={store ? '/vendedor' : '/vender'} className="btn btn-ghost btn-sm"><Store size={15} /> {store ? 'Minha loja' : 'Vender'}</Link>
          </span>
        </div>
        <h1 className="text-[2.1rem] leading-[1.02] md:text-6xl font-extrabold max-w-3xl">
          O que você quer comprar hoje?
        </h1>
        <p className="text-mist-300 mt-3 max-w-xl">
          Busque pelo produto e entre direto na live de quem está vendendo agora.
          {live.length > 0 && <> Neste momento: <strong className="text-mist">{live.length} lojas ao vivo</strong>, {compact(viewers)} pessoas assistindo.</>}
        </p>
        <form onSubmit={submit} className="relative mt-5 max-w-2xl">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display font-extrabold text-2xl text-tag">#</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="blusadefrio, tênis, maquiagem…"
            className="input h-14 md:h-16 rounded-full pl-11 pr-16 text-lg" aria-label="Buscar produtos" />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 md:h-12 md:w-12 rounded-full bg-onair text-white inline-flex items-center justify-center" aria-label="Buscar">
            <Search size={20} />
          </button>
        </form>
        {data && data.tags.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar mt-4 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
            {data.tags.map((t) => (
              <Link key={t.tag} to={`/buscar?q=%23${t.tag}`} className="chip">
                <span className="hash">#</span>{t.tag}
                {t.live_now > 0 && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-onair animate-pulsedot" aria-label="ao vivo agora" />}
              </Link>
            ))}
          </div>
        )}
      </section>

      {loading && <Spinner />}
      {error && <div className="px-4"><ErrorBox message={error} /></div>}

      {data && (
        <>
          {data.campaigns.length > 0 && (
            <section className="px-4 md:px-6 pb-8">
              <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory">
                {data.campaigns.map((c, i) => (
                  <div key={c.id} className={`shrink-0 snap-start ${i === 0 ? 'w-[88%] md:w-full' : 'w-[88%] md:w-[48%]'}`}>
                    <CampaignBanner c={c} compact={i > 0} />
                  </div>
                ))}
              </div>
            </section>
          )}
          <section className="px-4 md:px-6 pb-8">
            <div className="flex items-end justify-between mb-3">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-onair animate-pulsedot" /> Ao vivo agora
              </h2>
              <Link to="/ao-vivo" className="text-sm text-mist-300 hover:text-mist px-3 py-2.5 -mr-3">Ver todas</Link>
            </div>
            {live.length ? (
              <CardGrid>{live.slice(0, 10).map((l) => <LiveCard key={l.live_id} live={l} />)}</CardGrid>
            ) : (
              <Empty title="Nenhuma loja ao vivo neste momento">Veja as próximas lives abaixo ou ative o lembrete das suas lojas favoritas.</Empty>
            )}
          </section>

          {data.battles.length > 0 && (
            <section className="px-4 md:px-6 pb-8">
              <h2 className="text-2xl font-bold">Batalhas do Bem</h2>
              <p className="text-sm text-mist-400 mb-3">Duas lojas, o mesmo produto e o mesmo preço. Compre de qualquer lado: o lucro é dividido igualmente.</p>
              <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 snap-x">
                {data.battles.map((b) => <div key={b.battle_id} className="w-[280px] md:w-[320px] shrink-0 snap-start"><BattleCard b={b} /></div>)}
              </div>
            </section>
          )}

          <section className="px-4 md:px-6 pb-8">
            <h2 className="text-2xl font-bold mb-3">Categorias</h2>
            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-10 gap-2">
              {data.cats.map((c) => (
                <Link key={c.id} to={`/buscar?categoria=${c.slug}`} className="flex flex-col items-center gap-2 rounded-2xl bg-ink-800 border border-ink-700 py-3 px-1 hover:border-ink-500 transition-colors">
                  <span className="h-10 w-10 rounded-full bg-ink-700 inline-flex items-center justify-center text-tag"><CategoryIcon name={c.icon} /></span>
                  <span className="text-xs text-center leading-tight">{c.name}</span>
                </Link>
              ))}
            </div>
          </section>

          {next.length > 0 && (
            <section className="px-4 md:px-6 pb-8">
              <h2 className="text-2xl font-bold mb-3">Próximas lives</h2>
              <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                {next.map((l) => <div key={l.live_id} className="w-40 md:w-48 shrink-0"><LiveCard live={l} /></div>)}
              </div>
            </section>
          )}

          {!store && (
            <section className="px-4 md:px-6 pb-10">
              <div className="rounded-[28px] bg-tag text-ink p-6 md:p-10 flex flex-col md:flex-row md:items-center gap-4 md:gap-10">
                <div className="flex-1">
                  <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">Venda ao vivo para quem já está procurando o seu produto.</h2>
                  <p className="mt-2 text-ink/80 max-w-xl">Abra sua loja, cadastre os produtos com hashtags e transmita pelo celular. O comprador chega pela busca.</p>
                </div>
                <Link to="/vender" className="btn bg-ink text-mist hover:bg-ink-800 self-start md:self-auto">Abrir minha loja</Link>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
