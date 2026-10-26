import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Bell, BellRing, MessageCircle, Send, Share2, ShoppingBag, Truck, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { must, useAsync } from '@/lib/useAsync'
import { PRODUCT_SELECT } from '@/lib/api'
import { useFollow } from '@/lib/social'
import { useAuth } from '@/lib/auth'
import { compact, elapsed, shippingLabel, whenLabel } from '@/lib/format'
import type { Live as LiveT, Product, Store } from '@/lib/types'
import { Empty, OnAir, Price, Sheet, Spinner, StoreAvatar } from '@/components/ui'
import { ProductTile } from '@/components/cards'
import { BuySheet } from '@/components/BuySheet'

interface ChatMsg { id: string; name: string; text: string; mine?: boolean }

// Mensagens de exemplo enquanto o chat em tempo real não entra (fase 2)
const SAMPLE_CHAT: ChatMsg[] = [
  { id: 'a', name: 'Carla', text: 'Tem no tamanho G?' },
  { id: 'b', name: 'Juliano', text: 'Chegou ontem o meu, qualidade top 👏' },
  { id: 'c', name: 'Bia', text: 'Mostra a cor cinza de novo!' },
]

export default function Live() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [buy, setBuy] = useState<Product | null>(null)
  const [list, setList] = useState(false)
  const [chat, setChat] = useState<ChatMsg[]>(SAMPLE_CHAT)
  const [msg, setMsg] = useState('')
  const [showChat, setShowChat] = useState(true)
  const chatEnd = useRef<HTMLDivElement>(null)

  const { data, loading, error, setData } = useAsync(async () => {
    const live = must(await supabase.from('lives').select('*').eq('id', id!).maybeSingle()) as LiveT | null
    if (!live) return null
    const [store, lp, tags] = await Promise.all([
      supabase.from('stores').select('*').eq('id', live.store_id).single().then(must) as Promise<Store>,
      supabase.from('live_products').select(`position, products(${PRODUCT_SELECT})`).eq('live_id', live.id).order('position').then(must),
      supabase.from('live_hashtags').select('hashtags(tag)').eq('live_id', live.id).then(must),
    ])
    const products = (lp as unknown as { products: Product | null }[]).map((r) => r.products).filter((p): p is Product => !!p && p.active)
    const tagList = (tags as unknown as { hashtags: { tag: string } | null }[]).map((t) => t.hashtags?.tag).filter(Boolean) as string[]
    return { live, store, products, tags: tagList }
  }, [id])

  const { following, toggleFollow, reminder, toggleReminder } = useFollow(data?.store.id)
  const live = data?.live
  const isLive = live?.status === 'live'

  // contagem simples de espectadores (vira presença em tempo real na fase 2)
  useEffect(() => {
    if (!id || !isLive) return
    supabase.rpc('live_presence', { p_live: id, p_delta: 1 })
    return () => { supabase.rpc('live_presence', { p_live: id, p_delta: -1 }) }
  }, [id, isLive])

  // acompanha mudanças da live (produto fixado, encerramento) sem recarregar
  useEffect(() => {
    if (!id) return
    const ch = supabase.channel(`live-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lives', filter: `id=eq.${id}` }, (payload) => {
        setData((d) => (d ? { ...d, live: { ...d.live, ...(payload.new as LiveT) } } : d))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [id, setData])

  useEffect(() => { chatEnd.current?.scrollIntoView({ block: 'end' }) }, [chat])

  if (loading) return <div className="min-h-screen"><Spinner /></div>
  if (error || !data || !live) {
    return <Empty title="Live não encontrada" action={<Link to="/" className="btn btn-primary">Voltar para o início</Link>}>Ela pode ter sido removida.</Empty>
  }

  const { store, products, tags } = data
  const featured = products.find((p) => p.id === live.featured_product_id) ?? products[0]
  const free = shippingLabel(store)

  const send = (e: FormEvent) => {
    e.preventDefault()
    if (!msg.trim()) return
    setChat((c) => [...c.slice(-40), { id: crypto.randomUUID(), name: profile?.full_name?.split(' ')[0] ?? 'Você', text: msg.trim(), mine: true }])
    setMsg('')
  }

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: live.title, text: `${store.name} está ao vivo no LIVESHOP`, url })
      else { await navigator.clipboard.writeText(url); toast.success('Link copiado') }
    } catch { /* cancelado */ }
  }

  return (
    <div className="md:flex md:items-start md:justify-center md:gap-6 md:p-6 md:min-h-screen bg-ink-900">
      {/* Palco 9:16 */}
      <div className="relative h-[100dvh] md:h-[calc(100vh-48px)] md:aspect-[9/16] md:rounded-[28px] overflow-hidden bg-black mx-auto md:mx-0">
        <div className="screen absolute inset-0">
          {live.cover_url && <img src={live.cover_url} alt="" className={`h-full w-full object-cover ${isLive ? '' : 'opacity-50 grayscale'}`} />}
        </div>
        {isLive && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
            <span className="rounded-full bg-ink/70 backdrop-blur px-3 py-1.5 text-xs text-mist-300">Prévia: o vídeo ao vivo entra na fase 2</span>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 h-36 shade-t" />
        <div className="absolute inset-x-0 bottom-0 h-[60%] shade-b" />

        {/* Overlay padrão: loja no topo */}
        <div className="absolute top-0 inset-x-0 p-3 pt-[max(12px,env(safe-area-inset-top))] flex items-center gap-2">
          <button onClick={() => (history.length > 1 ? navigate(-1) : navigate('/'))} className="h-10 w-10 rounded-full bg-ink/60 backdrop-blur inline-flex items-center justify-center" aria-label="Voltar"><ArrowLeft size={18} /></button>
          <Link to={`/loja/${store.slug}`} className="flex items-center gap-2 rounded-full bg-ink/60 backdrop-blur pl-1 pr-3 py-1 min-w-0">
            <StoreAvatar name={store.name} url={store.logo_url} size={32} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold truncate max-w-[130px]">{store.name}</span>
              <span className="block text-[11px] text-mist-300">{isLive ? elapsed(live.started_at) : store.city + '/' + store.state}</span>
            </span>
          </Link>
          <button onClick={toggleFollow} className={`btn btn-sm h-8 px-3 ${following ? 'btn-ghost' : 'btn-primary'}`}>{following ? 'Seguindo' : 'Seguir'}</button>
          <span className="ml-auto">{isLive ? <OnAir viewers={live.viewers_count} /> : null}</span>
        </div>

        {/* Live não está no ar */}
        {!isLive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
            <p className="text-sm text-mist-300 mb-1">{live.status === 'scheduled' ? 'Live agendada' : 'Esta live já terminou'}</p>
            <h1 className="text-3xl font-extrabold mb-2">{live.title}</h1>
            {live.status === 'scheduled' && <p className="text-tag font-semibold mb-5">{whenLabel(live.scheduled_at)}</p>}
            <button onClick={toggleReminder} className={`btn ${reminder ? 'btn-ghost' : 'btn-tag'}`}>
              {reminder ? <BellRing size={18} /> : <Bell size={18} />} {reminder ? 'Lembrete ativo' : 'Me avise quando entrar ao vivo'}
            </button>
            <Link to={`/loja/${store.slug}`} className="mt-3 text-sm underline underline-offset-2 text-mist-300">Ver a loja</Link>
          </div>
        )}

        {/* Rodapé: chat, produto fixado e ações */}
        {isLive && (
          <div className="absolute bottom-0 inset-x-0 p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <div className="flex items-end gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="font-display font-bold text-lg leading-tight mb-1">{live.title}</h1>
                {tags.length > 0 && (
                  <div className="flex gap-x-2 flex-wrap -my-1 mb-1">
                    {tags.map((t) => <Link key={t} to={`/buscar?q=%23${t}`} className="text-xs text-mist-300 py-2 pr-1"><span className="hash">#</span>{t}</Link>)}
                  </div>
                )}
                {showChat && (
                  <div className="max-h-36 overflow-y-auto no-scrollbar space-y-1 mb-2 [mask-image:linear-gradient(to_bottom,transparent,black_30%)]" aria-live="polite">
                    {chat.map((c) => (
                      <p key={c.id} className="text-sm leading-snug"><span className={`font-semibold ${c.mine ? 'text-tag' : 'text-mist-300'}`}>{c.name}</span> {c.text}</p>
                    ))}
                    <div ref={chatEnd} />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 pb-1">
                <button onClick={() => setList(true)} className="relative h-11 w-11 rounded-full bg-tag text-ink inline-flex items-center justify-center" aria-label="Produtos da live">
                  <ShoppingBag size={20} />
                  <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-onair text-white text-[11px] font-bold inline-flex items-center justify-center">{products.length}</span>
                </button>
                <button onClick={() => setShowChat((s) => !s)} className="h-11 w-11 rounded-full bg-ink/60 backdrop-blur inline-flex items-center justify-center" aria-label={showChat ? 'Ocultar chat' : 'Mostrar chat'}><MessageCircle size={20} /></button>
                <button onClick={share} className="h-11 w-11 rounded-full bg-ink/60 backdrop-blur inline-flex items-center justify-center" aria-label="Compartilhar"><Share2 size={19} /></button>
              </div>
            </div>

            {featured && (
              <div className="flex items-center gap-3 rounded-[20px] bg-mist text-ink p-2 pr-2.5 mb-2">
                {featured.product_images?.[0] && <img src={[...featured.product_images].sort((a, b) => a.position - b.position)[0].url} alt="" className="h-14 w-14 rounded-2xl object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-onair">Em destaque agora</p>
                  <p className="text-sm font-semibold truncate">{featured.name}</p>
                  <span className="inline-flex items-baseline gap-2">
                    <span className="font-display font-extrabold text-lg">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(featured.promo_price ?? featured.price)}</span>
                    {featured.promo_price != null && <span className="text-xs line-through text-ink/50">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(featured.price)}</span>}
                  </span>
                </div>
                <button onClick={() => setBuy(featured)} className="btn btn-primary btn-sm h-11 px-5">Comprar</button>
              </div>
            )}

            <form onSubmit={send} className="flex items-center gap-2">
              <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Pergunte algo para a loja…"
                className="flex-1 h-11 rounded-full bg-ink/60 backdrop-blur border border-white/10 px-4 text-base placeholder:text-mist-400 outline-none focus:border-tag" aria-label="Mensagem" />
              <button className="h-11 w-11 rounded-full bg-ink/60 backdrop-blur inline-flex items-center justify-center" aria-label="Enviar"><Send size={18} /></button>
            </form>
          </div>
        )}
      </div>

      {/* Desktop: produtos ao lado do palco */}
      <aside className="hidden md:block w-[340px] shrink-0">
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-4">
            <StoreAvatar name={store.name} url={store.logo_url} size={44} />
            <div className="min-w-0">
              <Link to={`/loja/${store.slug}`} className="font-semibold hover:underline">{store.name}</Link>
              <p className="text-xs text-mist-400">{store.city}/{store.state} · {compact(store.rating_count)} avaliações</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4 text-xs">
            {free && <span className="chip h-7 text-cool"><Truck size={13} /> {free}</span>}
            {store.fast_delivery && <span className="chip h-7 text-tag"><Zap size={13} /> Envio em 48h</span>}
          </div>
          <h2 className="font-bold mb-3">Produtos desta live</h2>
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {products.map((p) => <ProductTile key={p.id} p={p} onClick={() => setBuy(p)} />)}
          </div>
        </div>
      </aside>

      <Sheet open={list} onClose={() => setList(false)} title={`Produtos da live (${products.length})`}>
        <ul className="divide-y divide-ink-700">
          {products.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <img src={[...(p.product_images ?? [])].sort((a, b) => a.position - b.position)[0]?.url} alt="" className="h-16 w-16 rounded-2xl object-cover bg-ink-700" />
              <div className="min-w-0 flex-1">
                {p.id === featured?.id && <p className="text-[11px] font-semibold text-onair">Em destaque</p>}
                <p className="text-sm font-medium line-clamp-2">{p.name}</p>
                <Price price={p.price} promo={p.promo_price} size="sm" />
              </div>
              <button onClick={() => { setList(false); setBuy(p) }} className="btn btn-primary btn-sm">Comprar</button>
            </li>
          ))}
        </ul>
      </Sheet>
      <BuySheet product={buy} onClose={() => setBuy(null)} />
    </div>
  )
}
