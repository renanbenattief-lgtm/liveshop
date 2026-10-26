import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Truck, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { must, useAsync } from '@/lib/useAsync'
import { PRODUCT_SELECT } from '@/lib/api'
import { shippingLabel } from '@/lib/format'
import type { Live, Product, Store } from '@/lib/types'
import { Empty, OnAir, Price, Rating, Spinner, StoreAvatar } from '@/components/ui'
import { BuySheet } from '@/components/BuySheet'

export default function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [img, setImg] = useState(0)
  const [buy, setBuy] = useState<Product | null>(null)
  const { data, loading } = useAsync(async () => {
    const product = must(await supabase.from('products').select(PRODUCT_SELECT).eq('id', id!).maybeSingle()) as Product | null
    if (!product) return null
    const [store, live] = await Promise.all([
      supabase.from('stores').select('*').eq('id', product.store_id).single().then(must) as Promise<Store>,
      supabase.from('lives').select('*').eq('store_id', product.store_id).eq('status', 'live').maybeSingle().then(must) as Promise<Live | null>,
    ])
    return { product, store, live }
  }, [id])

  if (loading) return <Spinner />
  if (!data) return <Empty title="Produto não encontrado" action={<Link to="/" className="btn btn-primary">Voltar para o início</Link>} />
  const { product, store, live } = data
  const images = [...(product.product_images ?? [])].sort((a, b) => a.position - b.position)
  const tags = (product.product_hashtags ?? []).map((h) => h.hashtags?.tag).filter(Boolean) as string[]
  const free = shippingLabel(store)

  return (
    <div className="max-w-5xl mx-auto md:px-6 md:pt-8 md:grid md:grid-cols-2 md:gap-10">
      <div className="relative">
        <button onClick={() => navigate(-1)} className="md:hidden absolute left-3 top-3 z-10 h-10 w-10 rounded-full bg-ink/70 backdrop-blur inline-flex items-center justify-center" aria-label="Voltar"><ArrowLeft size={18} /></button>
        <div className="aspect-square md:rounded-[28px] overflow-hidden bg-ink-700">
          {images[img] && <img src={images[img].url} alt={product.name} className="h-full w-full object-cover" />}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 px-4 md:px-0 mt-3">
            {images.map((im, i) => (
              <button key={im.id} onClick={() => setImg(i)} className={`h-16 w-16 rounded-xl overflow-hidden ring-2 ${i === img ? 'ring-tag' : 'ring-transparent'}`} aria-label={`Foto ${i + 1}`}>
                <img src={im.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 md:px-0 pt-5 pb-28 md:pb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold leading-tight">{product.name}</h1>
        <div className="mt-2"><Price price={product.price} promo={product.promo_price} size="lg" /></div>
        <p className="text-sm text-mist-400 mt-1">{product.stock > 0 ? `${product.stock} em estoque` : 'Esgotado'}</p>

        {live && (
          <Link to={`/live/${live.id}`} className="mt-5 block rounded-[22px] bg-onair/15 border border-onair/40 p-3">
            <div className="flex items-center gap-3">
              <OnAir viewers={live.viewers_count} />
              <span className="ml-auto text-sm font-semibold text-onair">Assistir</span>
            </div>
            <p className="text-sm mt-2"><span className="font-semibold">{store.name}</span> está vendendo este produto ao vivo agora</p>
          </Link>
        )}

        {product.description && <p className="text-mist-300 mt-5 whitespace-pre-line">{product.description}</p>}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-5">
            {tags.map((t) => <Link key={t} to={`/buscar?q=%23${t}`} className="chip"><span className="hash">#</span>{t}</Link>)}
          </div>
        )}

        <Link to={`/loja/${store.slug}`} className="card flex items-center gap-3 p-3 mt-6 hover:border-ink-500">
          <StoreAvatar name={store.name} url={store.logo_url} size={44} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{store.name}</p>
            <div className="flex flex-wrap gap-x-3 text-xs text-mist-400"><Rating value={store.rating} count={store.rating_count} /><span>{store.city}/{store.state}</span></div>
          </div>
        </Link>
        <div className="flex flex-wrap gap-2 mt-3 text-sm">
          {free && <span className="chip text-cool"><Truck size={14} /> {free}</span>}
          {store.fast_delivery && <span className="chip text-tag"><Zap size={14} /> Envio em 48h</span>}
        </div>

        <div className="fixed md:static bottom-16 inset-x-0 p-4 md:p-0 md:mt-6 bg-ink/95 md:bg-transparent border-t border-ink-700 md:border-0 z-30">
          <button onClick={() => setBuy(product)} disabled={product.stock === 0} className="btn btn-primary w-full">Comprar</button>
        </div>
      </div>
      <BuySheet product={buy} onClose={() => setBuy(null)} />
    </div>
  )
}
