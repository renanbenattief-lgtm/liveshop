import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Camera, CameraOff, Pin, RefreshCw, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { must, useAsync } from '@/lib/useAsync'
import { useAuth } from '@/lib/auth'
import { PRODUCT_SELECT } from '@/lib/api'
import { elapsed, money, whenLabel } from '@/lib/format'
import type { Live, Product } from '@/lib/types'
import { OnAir, Sheet, Spinner, StoreAvatar } from '@/components/ui'

/**
 * Estúdio do vendedor: prévia da câmera com a moldura padrão do LIVESHOP,
 * fixar produto em destaque e encerrar. A transmissão de vídeo real entra na fase 2.
 */
export default function LiveStudio() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { store } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [camOn, setCamOn] = useState(false)
  const [camErr, setCamErr] = useState<string | null>(null)
  const [sheet, setSheet] = useState(false)
  const [, tick] = useState(0)

  const { data, loading, setData } = useAsync(async () => {
    const live = must(await supabase.from('lives').select('*').eq('id', id!).single()) as Live
    const lp = must(await supabase.from('live_products').select(`position, products(${PRODUCT_SELECT})`).eq('live_id', id!).order('position')) as unknown as { products: Product | null }[]
    return { live, products: lp.map((r) => r.products).filter(Boolean) as Product[] }
  }, [id])

  const live = data?.live
  const isLive = live?.status === 'live'

  const stopCam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCamOn(false)
  }, [])

  const startCam = useCallback(async (mode: 'user' | 'environment') => {
    stopCam()
    setCamErr(null)
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: false })
      streamRef.current = s
      if (videoRef.current) videoRef.current.srcObject = s
      setCamOn(true)
    } catch {
      setCamErr('Não conseguimos acessar a câmera. Permita o acesso no navegador e tente de novo.')
    }
  }, [stopCam])

  useEffect(() => { startCam(facing); return stopCam }, [facing, startCam, stopCam])

  // espectadores e status em tempo real
  useEffect(() => {
    if (!id) return
    const ch = supabase.channel(`studio-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lives', filter: `id=eq.${id}` }, (p) => {
        setData((d) => (d ? { ...d, live: { ...d.live, ...(p.new as Live) } } : d))
      }).subscribe()
    const t = setInterval(() => tick((x) => x + 1), 30000)
    return () => { supabase.removeChannel(ch); clearInterval(t) }
  }, [id, setData])

  if (loading || !data || !live) return <Spinner />
  if (!store || live.store_id !== store.id) return <p className="p-6">Esta live não é da sua loja.</p>

  const featured = data.products.find((p) => p.id === live.featured_product_id)

  const pin = async (p: Product) => {
    setData((d) => (d ? { ...d, live: { ...d.live, featured_product_id: p.id } } : d))
    const { error } = await supabase.from('lives').update({ featured_product_id: p.id }).eq('id', live.id)
    if (error) toast.error(error.message); else toast.success(`${p.name} em destaque`)
    setSheet(false)
  }

  const goLive = async () => {
    const { error } = await supabase.rpc('start_live', { p_live: live.id })
    if (error) return toast.error(error.message)
    setData((d) => (d ? { ...d, live: { ...d.live, status: 'live', started_at: new Date().toISOString() } } : d))
    toast.success('Você está ao vivo')
  }

  const end = async () => {
    if (!window.confirm('Encerrar a live agora?')) return
    const { error } = await supabase.rpc('end_live', { p_live: live.id })
    if (error) return toast.error(error.message)
    stopCam()
    toast.success('Live encerrada')
    navigate('/vendedor/lives')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black md:flex md:items-center md:justify-center md:gap-6 md:bg-ink-900 md:p-6">
      <div className="relative h-full md:h-[calc(100vh-48px)] md:aspect-[9/16] md:rounded-[28px] overflow-hidden bg-ink-800">
        <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 h-full w-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`} />
        {!camOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 gap-3">
            <CameraOff size={36} className="text-mist-500" />
            <p className="text-mist-300">{camErr ?? 'Câmera desligada'}</p>
            <button onClick={() => startCam(facing)} className="btn btn-ghost btn-sm">Ligar câmera</button>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 h-32 shade-t pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 shade-b pointer-events-none" />

        {/* Moldura padrão: igual à que o comprador vê */}
        <div className="absolute top-0 inset-x-0 p-3 pt-[max(12px,env(safe-area-inset-top))] flex items-center gap-2">
          <Link to="/vendedor/lives" className="h-10 w-10 rounded-full bg-ink/60 backdrop-blur inline-flex items-center justify-center" aria-label="Sair do estúdio"><ArrowLeft size={18} /></Link>
          <div className="flex items-center gap-2 rounded-full bg-ink/60 backdrop-blur pl-1 pr-3 py-1 min-w-0">
            <StoreAvatar name={store.name} url={store.logo_url} size={30} />
            <span className="text-sm font-semibold truncate max-w-[120px]">{store.name}</span>
          </div>
          <span className="ml-auto">{isLive ? <OnAir viewers={live.viewers_count} /> : <span className="rounded-full bg-ink/70 px-3 py-1 text-xs font-semibold">Prévia</span>}</span>
        </div>

        <div className="absolute bottom-0 inset-x-0 p-3 pb-[max(12px,env(safe-area-inset-bottom))] space-y-2">
          <p className="font-display font-bold text-lg leading-tight">{live.title}</p>
          <p className="text-xs text-mist-300">{isLive ? `No ar ${elapsed(live.started_at)}` : live.status === 'scheduled' ? `Agendada ${live.scheduled_at ? whenLabel(live.scheduled_at) : ''}` : 'Live encerrada'}</p>

          {featured && (
            <button onClick={() => setSheet(true)} className="w-full flex items-center gap-3 rounded-[20px] bg-mist text-ink p-2 text-left">
              {featured.product_images?.[0] && <img src={[...featured.product_images].sort((a, b) => a.position - b.position)[0].url} alt="" className="h-12 w-12 rounded-xl object-cover" />}
              <span className="flex-1 min-w-0">
                <span className="block text-[11px] font-semibold text-onair">Em destaque para o comprador</span>
                <span className="block text-sm font-semibold truncate">{featured.name}</span>
                <span className="block font-display font-extrabold">{money(featured.promo_price ?? featured.price)}</span>
              </span>
              <span className="text-xs font-semibold pr-1">Trocar</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))} className="h-12 w-12 rounded-full bg-ink/60 backdrop-blur inline-flex items-center justify-center" aria-label="Virar câmera"><RefreshCw size={19} /></button>
            <button onClick={() => (camOn ? stopCam() : startCam(facing))} className="h-12 w-12 rounded-full bg-ink/60 backdrop-blur inline-flex items-center justify-center" aria-label={camOn ? 'Desligar câmera' : 'Ligar câmera'}>{camOn ? <Camera size={19} /> : <CameraOff size={19} />}</button>
            <button onClick={() => setSheet(true)} className="md:hidden h-12 w-12 rounded-full bg-tag text-ink inline-flex items-center justify-center" aria-label="Produtos"><ShoppingBag size={19} /></button>
            {isLive
              ? <button onClick={end} className="btn btn-primary flex-1">Encerrar live</button>
              : live.status === 'scheduled'
                ? <button onClick={goLive} disabled={store.status !== 'approved'} className="btn btn-primary flex-1">{store.status === 'approved' ? 'Entrar ao vivo' : 'Aguardando aprovação'}</button>
                : <Link to="/vendedor/lives/nova" className="btn btn-ghost flex-1">Nova live</Link>}
          </div>
          {isLive && <p className="text-[11px] text-mist-400 text-center">Prévia da câmera. A transmissão de vídeo para os compradores entra na fase 2.</p>}
        </div>
      </div>

      <aside className="hidden md:block w-[340px] card p-4 self-stretch overflow-y-auto">
        <h2 className="font-bold mb-1">Produtos da live</h2>
        <p className="text-sm text-mist-400 mb-3">Toque para fixar em destaque na tela do comprador.</p>
        <ProductPinList products={data.products} featuredId={live.featured_product_id} onPin={pin} />
      </aside>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Fixar produto em destaque">
        <ProductPinList products={data.products} featuredId={live.featured_product_id} onPin={pin} />
      </Sheet>
    </div>
  )
}

function ProductPinList({ products, featuredId, onPin }: { products: Product[]; featuredId: string | null; onPin: (p: Product) => void }) {
  return (
    <ul className="space-y-2">
      {products.map((p) => {
        const on = p.id === featuredId
        const img = [...(p.product_images ?? [])].sort((a, b) => a.position - b.position)[0]?.url
        return (
          <li key={p.id}>
            <button onClick={() => onPin(p)} className={`w-full flex items-center gap-3 p-2 rounded-2xl border text-left ${on ? 'border-tag bg-tag/10' : 'border-ink-600 hover:border-ink-500'}`}>
              <div className="h-14 w-14 rounded-xl overflow-hidden bg-ink-700 shrink-0">{img && <img src={img} alt="" className="h-full w-full object-cover" />}</div>
              <span className="flex-1 min-w-0">
                <span className="block text-sm truncate">{p.name}</span>
                <span className="block text-tag font-semibold text-sm">{money(p.promo_price ?? p.price)}</span>
                <span className="block text-xs text-mist-500">{p.stock} em estoque</span>
              </span>
              <Pin size={18} className={on ? 'text-tag fill-tag' : 'text-mist-500'} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
