import { Link, useParams } from 'react-router-dom'
import { Bell, BellRing, CalendarClock, MapPin, Truck, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { must, useAsync } from '@/lib/useAsync'
import { PRODUCT_SELECT } from '@/lib/api'
import { useFollow } from '@/lib/social'
import { compact, shippingLabel, whenLabel } from '@/lib/format'
import type { Live, Product, Store } from '@/lib/types'
import { Empty, OnAir, Rating, Spinner, StoreAvatar } from '@/components/ui'
import { CardGrid, ProductTile } from '@/components/cards'

export default function StorePage() {
  const { slug } = useParams()
  const { data, loading } = useAsync(async () => {
    const store = must(await supabase.from('stores').select('*').eq('slug', slug!).maybeSingle()) as Store | null
    if (!store) return null
    const [products, lives, followers] = await Promise.all([
      supabase.from('products').select(PRODUCT_SELECT).eq('store_id', store.id).eq('active', true).order('created_at', { ascending: false }).then(must),
      supabase.from('lives').select('*').eq('store_id', store.id).in('status', ['live', 'scheduled']).order('scheduled_at').then(must),
      supabase.rpc('store_follower_count', { p_store: store.id }).then(must),
    ])
    return { store, products: products as Product[], lives: lives as Live[], followers: followers as number }
  }, [slug])
  const { following, toggleFollow, reminder, toggleReminder } = useFollow(data?.store.id)

  if (loading) return <Spinner />
  if (!data) return <Empty title="Loja não encontrada" action={<Link to="/" className="btn btn-primary">Voltar para o início</Link>} />

  const { store, products, lives, followers } = data
  const onAir = lives.find((l) => l.status === 'live')
  const upcoming = lives.filter((l) => l.status === 'scheduled' && l.scheduled_at && new Date(l.scheduled_at) > new Date())
  const free = shippingLabel(store)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="relative h-40 md:h-64 bg-ink-700 md:rounded-b-[32px] overflow-hidden">
        {store.cover_url && <img src={store.cover_url} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 shade-b opacity-70" />
      </div>
      <div className="px-4 md:px-6 -mt-10 relative">
        <div className="flex items-end gap-4">
          <StoreAvatar name={store.name} url={store.logo_url} size={88} ring={!!onAir} />
          {onAir && <Link to={`/live/${onAir.id}`} className="mb-2"><OnAir viewers={onAir.viewers_count} /></Link>}
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold mt-3">{store.name}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-mist-300">
          <Rating value={store.rating} count={store.rating_count} />
          <span className="inline-flex items-center gap-1"><MapPin size={14} />{store.city}/{store.state}</span>
          <span>{compact(followers)} seguidores</span>
        </div>
        {store.description && <p className="text-mist-300 mt-3 max-w-2xl">{store.description}</p>}

        <div className="flex flex-wrap gap-2 mt-4">
          {free && <span className="chip text-cool"><Truck size={15} /> {free}</span>}
          {store.fast_delivery
            ? <span className="chip text-tag"><Zap size={15} /> Envio em até 48h</span>
            : <span className="chip">Envio em até {store.shipping_days} dias úteis</span>}
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          {onAir && <Link to={`/live/${onAir.id}`} className="btn btn-primary">Assistir ao vivo</Link>}
          <button onClick={toggleFollow} className={`btn ${following ? 'btn-ghost' : onAir ? 'btn-outline' : 'btn-primary'}`}>{following ? 'Seguindo' : 'Seguir loja'}</button>
          {!onAir && (
            <button onClick={toggleReminder} className="btn btn-ghost">
              {reminder ? <BellRing size={18} className="text-tag" /> : <Bell size={18} />} {reminder ? 'Lembrete ativo' : 'Me avise quando entrar ao vivo'}
            </button>
          )}
        </div>

        {upcoming.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-bold mb-3">Próximas lives</h2>
            <ul className="space-y-2">
              {upcoming.map((l) => (
                <li key={l.id}>
                  <Link to={`/live/${l.id}`} className="card flex items-center gap-3 p-3 hover:border-ink-500">
                    <span className="h-11 w-11 rounded-2xl bg-ink-700 text-tag inline-flex items-center justify-center"><CalendarClock size={20} /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold truncate">{l.title}</span>
                      <span className="block text-sm text-tag">{whenLabel(l.scheduled_at)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-8 pb-8">
          <h2 className="text-xl font-bold mb-3">Produtos ({products.length})</h2>
          {products.length
            ? <CardGrid>{products.map((p) => <ProductTile key={p.id} p={p} />)}</CardGrid>
            : <Empty title="Esta loja ainda não cadastrou produtos" />}
        </section>
      </div>
    </div>
  )
}
