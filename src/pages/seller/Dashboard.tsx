import { Link } from 'react-router-dom'
import { CalendarClock, Package, Radio, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { must, useAsync } from '@/lib/useAsync'
import { useAuth } from '@/lib/auth'
import { compact, whenLabel } from '@/lib/format'
import type { Live, Product } from '@/lib/types'
import { OnAir, Spinner } from '@/components/ui'

export default function Dashboard() {
  const { store } = useAuth()
  const { data, loading } = useAsync(async () => {
    const [lives, products, followers, lp] = await Promise.all([
      supabase.from('lives').select('*').eq('store_id', store!.id).order('created_at', { ascending: false }).then(must) as Promise<Live[]>,
      supabase.from('products').select('id, name, stock, active, product_images(url, position)').eq('store_id', store!.id).then(must) as Promise<Product[]>,
      supabase.rpc('store_follower_count', { p_store: store!.id }).then(must) as Promise<number>,
      supabase.from('live_products').select('product_id, lives!inner(store_id)').eq('lives.store_id', store!.id).then(must) as Promise<{ product_id: string }[]>,
    ])
    return { lives, products, followers, lp }
  }, [store?.id])

  if (loading || !data) return <Spinner />
  const { lives, products, followers, lp } = data
  const onAir = lives.find((l) => l.status === 'live')
  const done = lives.filter((l) => l.status === 'ended')
  const upcoming = lives.filter((l) => l.status === 'scheduled').sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))
  const peakTotal = done.reduce((a, l) => a + l.peak_viewers, 0)
  const lowStock = products.filter((p) => p.active && p.stock <= 5)

  // produtos que mais aparecem nas lives (vendas entram na fase 3)
  const counts = new Map<string, number>()
  lp.forEach((r) => counts.set(r.product_id, (counts.get(r.product_id) ?? 0) + 1))
  const top = products.filter((p) => counts.has(p.id)).sort((a, b) => counts.get(b.id)! - counts.get(a.id)!).slice(0, 5)

  const stats = [
    { icon: Radio, label: 'Lives realizadas', value: done.length },
    { icon: Users, label: 'Pico de espectadores somado', value: compact(peakTotal) },
    { icon: Users, label: 'Seguidores', value: compact(followers) },
    { icon: Package, label: 'Produtos ativos', value: products.filter((p) => p.active).length },
  ]

  return (
    <div className="space-y-6 pb-10">
      {onAir ? (
        <Link to={`/vendedor/live/${onAir.id}`} className="flex items-center gap-4 rounded-[24px] bg-onair text-white p-5">
          <OnAir viewers={onAir.viewers_count} />
          <span className="flex-1 font-semibold truncate">{onAir.title}</span>
          <span className="btn btn-sm bg-white text-onair">Voltar ao estúdio</span>
        </Link>
      ) : (
        <Link to="/vendedor/lives/nova" className="block rounded-[24px] bg-tag text-ink p-6">
          <p className="font-display text-2xl md:text-3xl font-extrabold">Entrar ao vivo agora</p>
          <p className="text-ink/75 mt-1">Escolha os produtos, dê um título e comece a transmitir.</p>
        </Link>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <s.icon size={18} className="text-mist-400" />
            <p className="font-display text-3xl font-extrabold mt-2">{s.value}</p>
            <p className="text-sm text-mist-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="card p-4">
          <h2 className="font-bold mb-3">Próximas lives</h2>
          {upcoming.length ? (
            <ul className="space-y-2">
              {upcoming.slice(0, 5).map((l) => (
                <li key={l.id}><Link to={`/vendedor/live/${l.id}`} className="flex items-center gap-3 text-sm hover:text-tag">
                  <CalendarClock size={16} className="text-tag" /><span className="flex-1 truncate">{l.title}</span><span className="text-mist-400">{whenLabel(l.scheduled_at)}</span>
                </Link></li>
              ))}
            </ul>
          ) : <p className="text-sm text-mist-400">Nenhuma live agendada. <Link to="/vendedor/lives/nova" className="text-tag">Agendar</Link></p>}
        </section>
        <section className="card p-4">
          <h2 className="font-bold mb-3">Produtos mais exibidos em lives</h2>
          {top.length ? (
            <ul className="space-y-2">
              {top.map((p) => <li key={p.id} className="flex items-center gap-3 text-sm"><span className="flex-1 truncate">{p.name}</span><span className="text-mist-400">{counts.get(p.id)} lives</span></li>)}
            </ul>
          ) : <p className="text-sm text-mist-400">Aparece aqui depois das primeiras lives. Os números de venda entram com o checkout.</p>}
        </section>
      </div>

      {lowStock.length > 0 && (
        <section className="card p-4">
          <h2 className="font-bold mb-2">Estoque baixo</h2>
          <ul className="text-sm space-y-1">
            {lowStock.map((p) => <li key={p.id}><Link to={`/vendedor/produtos/${p.id}`} className="hover:text-tag">{p.name}</Link> <span className="text-onair">({p.stock} un.)</span></li>)}
          </ul>
        </section>
      )}
    </div>
  )
}
