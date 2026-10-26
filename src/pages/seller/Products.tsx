import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { must, useAsync } from '@/lib/useAsync'
import { useAuth } from '@/lib/auth'
import { PRODUCT_SELECT } from '@/lib/api'
import type { Product } from '@/lib/types'
import { Empty, Price, Spinner } from '@/components/ui'

export default function Products() {
  const { store } = useAuth()
  const { data, loading } = useAsync(async () =>
    must(await supabase.from('products').select(PRODUCT_SELECT).eq('store_id', store!.id).order('created_at', { ascending: false })) as Product[], [store?.id])

  if (loading) return <Spinner />
  return (
    <div className="pb-10">
      <div className="flex items-center justify-between mb-4">
        <p className="text-mist-400 text-sm">{data?.length ?? 0} produtos</p>
        <Link to="/vendedor/produtos/novo" className="btn btn-tag btn-sm"><Plus size={16} /> Novo produto</Link>
      </div>
      {!data?.length ? (
        <Empty title="Cadastre seu primeiro produto" action={<Link to="/vendedor/produtos/novo" className="btn btn-primary">Novo produto</Link>}>
          Os produtos aparecem na sua live e na busca pelas hashtags que você definir.
        </Empty>
      ) : (
        <ul className="card divide-y divide-ink-700">
          {data.map((p) => {
            const img = [...(p.product_images ?? [])].sort((a, b) => a.position - b.position)[0]?.url
            const tags = (p.product_hashtags ?? []).map((h) => h.hashtags?.tag).filter(Boolean)
            return (
              <li key={p.id}>
                <Link to={`/vendedor/produtos/${p.id}`} className="flex items-center gap-3 p-3 hover:bg-ink-700/40">
                  <div className="h-16 w-16 rounded-2xl overflow-hidden bg-ink-700 shrink-0">{img && <img src={img} alt="" className="h-full w-full object-cover" />}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.name} {!p.active && <span className="text-xs text-mist-500 ml-1">(pausado)</span>}</p>
                    <Price price={p.price} promo={p.promo_price} size="sm" />
                    <p className="text-xs text-mist-400 truncate">{tags.map((t) => `#${t}`).join(' ')}</p>
                  </div>
                  <span className={`text-sm ${p.stock <= 5 ? 'text-onair' : 'text-mist-400'}`}>{p.stock} un.</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
