import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { must, useAsync } from '@/lib/useAsync'
import { useAuth } from '@/lib/auth'
import { PRODUCT_SELECT } from '@/lib/api'
import type { Product } from '@/lib/types'
import { Empty, Field, Price, Spinner } from '@/components/ui'
import { ImagePicker, TagInput } from '@/components/inputs'
import { cnpjActive } from '@/lib/cnpj'

export default function LiveSetup() {
  const { store } = useAuth()
  const navigate = useNavigate()
  const products = useAsync(async () =>
    must(await supabase.from('products').select(PRODUCT_SELECT).eq('store_id', store!.id).eq('active', true).order('created_at', { ascending: false })) as Product[], [store?.id])
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [cover, setCover] = useState<string[]>([])
  const [picked, setPicked] = useState<string[]>([])
  const [when, setWhen] = useState<'now' | 'later'>(store?.status === 'approved' ? 'now' : 'later')
  const [date, setDate] = useState('')
  const [campaignId, setCampaignId] = useState('')
  // campanhas em que a loja entrou e que ainda não terminaram
  const campaigns = useAsync(async () => {
    const joined = must(await supabase.from('campaign_stores').select('campaigns(id, name, hashtag, starts_at, ends_at, active)').eq('store_id', store!.id)) as unknown as { campaigns: { id: string; name: string; hashtag: string; starts_at: string; ends_at: string; active: boolean } | null }[]
    return joined.map((j) => j.campaigns).filter((c): c is NonNullable<typeof c> => !!c && c.active && new Date(c.ends_at) > new Date())
  }, [store?.id])
  const liveWhen = when === 'later' && date ? new Date(date) : new Date()
  const fitting = (campaigns.data ?? []).filter((c) => liveWhen >= new Date(c.starts_at) && liveWhen <= new Date(c.ends_at))
  const [busy, setBusy] = useState(false)
  const approved = store?.status === 'approved' && !!store && cnpjActive(store)

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  // sugere hashtags a partir dos produtos escolhidos
  const suggested = [...new Set((products.data ?? []).filter((p) => picked.includes(p.id))
    .flatMap((p) => (p.product_hashtags ?? []).map((h) => h.hashtags?.tag).filter(Boolean) as string[]))].filter((t) => !tags.includes(t)).slice(0, 8)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!store) return
    if (!picked.length) return toast.error('Escolha pelo menos um produto para a live')
    if (when === 'later' && !date) return toast.error('Escolha a data e o horário da live')
    setBusy(true)
    try {
      const firstImg = (products.data ?? []).find((p) => p.id === picked[0])?.product_images?.[0]?.url ?? null
      const live = must(await supabase.from('lives').insert({
        store_id: store.id, title: title.trim(), cover_url: cover[0] ?? store.cover_url ?? firstImg,
        status: 'scheduled', scheduled_at: when === 'later' ? new Date(date).toISOString() : null, featured_product_id: picked[0],
        campaign_id: fitting.some((c) => c.id === campaignId) ? campaignId : null,
      }).select('id').single()) as { id: string }
      must(await supabase.from('live_products').insert(picked.map((product_id, position) => ({ live_id: live.id, product_id, position }))))
      if (tags.length) must(await supabase.rpc('set_live_tags', { p_live: live.id, p_tags: tags }))
      if (when === 'now') must(await supabase.rpc('start_live', { p_live: live.id }))
      toast.success(when === 'now' ? 'Você está ao vivo' : 'Live agendada')
      navigate(`/vendedor/live/${live.id}`)
    } catch (err) {
      toast.error('Não foi possível criar a live', { description: err instanceof Error ? err.message : '' })
    } finally { setBusy(false) }
  }

  if (products.loading) return <Spinner />
  if (!products.data?.length) return (
    <Empty title="Cadastre produtos antes de entrar ao vivo" action={<Link to="/vendedor/produtos/novo" className="btn btn-primary">Cadastrar produto</Link>}>
      Os produtos da live aparecem na tela para o comprador tocar em Comprar.
    </Empty>
  )

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link to="/vendedor/lives" className="h-10 w-10 rounded-full bg-ink-700 inline-flex items-center justify-center" aria-label="Voltar"><ArrowLeft size={18} /></Link>
        <h1 className="text-2xl font-extrabold">Preparar live</h1>
      </div>

      <Field label="Título da live" hint="Diga o que vai vender. Ex: Queima de estoque de blusas de frio">
        <input className="input" required maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>

      <div>
        <p className="field-label">Produtos da live ({picked.length})</p>
        <p className="text-xs text-mist-500 mb-2">O primeiro escolhido começa em destaque. Você troca o destaque durante a live.</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {products.data.map((p) => {
            const on = picked.includes(p.id)
            const img = [...(p.product_images ?? [])].sort((a, b) => a.position - b.position)[0]?.url
            return (
              <li key={p.id} className="min-w-0">
                <button type="button" onClick={() => toggle(p.id)} aria-pressed={on}
                  className={`w-full text-left flex items-center gap-3 p-2 rounded-2xl border transition-colors ${on ? 'border-tag bg-tag/10' : 'border-ink-600 bg-ink-800 hover:border-ink-500'}`}>
                  <div className="h-14 w-14 rounded-xl overflow-hidden bg-ink-700 shrink-0">{img && <img src={img} alt="" className="h-full w-full object-cover" />}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm truncate">{p.name}</p><Price price={p.price} promo={p.promo_price} size="sm" /></div>
                  <span className={`h-7 w-7 rounded-full inline-flex items-center justify-center text-xs font-bold ${on ? 'bg-tag text-ink' : 'border border-ink-500'}`}>
                    {on ? (picked.indexOf(p.id) === 0 ? '★' : <Check size={14} />) : ''}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <Field label="Hashtags da live" hint="Ajudam a sua live a aparecer na busca">
        <TagInput value={tags} onChange={setTags} />
      </Field>
      {suggested.length > 0 && (
        <div className="flex flex-wrap gap-2 -mt-3">
          <span className="text-xs text-mist-500 self-center">Sugestões:</span>
          {suggested.map((t) => <button type="button" key={t} onClick={() => setTags([...tags, t])} className="chip h-8"><span className="hash">#</span>{t}</button>)}
        </div>
      )}

      {(campaigns.data?.length ?? 0) > 0 && (
        <Field label="Campanha" hint={fitting.length ? 'A hashtag da campanha entra na live automaticamente.' : 'Nenhuma das suas campanhas acontece na data escolhida.'}>
          <select className="input px-3" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} disabled={!fitting.length}>
            <option value="">Sem campanha</option>
            {fitting.map((c) => <option key={c.id} value={c.id}>{c.name} · #{c.hashtag}</option>)}
          </select>
        </Field>
      )}

      <Field label="Capa da live" hint="Aparece na busca antes de o comprador entrar. Se não enviar, usamos a capa da loja.">
        <div className="w-32"><ImagePicker value={cover} onChange={setCover} folder="lives" aspect="tall" /></div>
      </Field>

      <div>
        <p className="field-label">Quando</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={!approved} onClick={() => setWhen('now')} className={`chip h-12 justify-center ${when === 'now' ? 'chip-on' : ''} disabled:opacity-40`}>Agora</button>
          <button type="button" onClick={() => setWhen('later')} className={`chip h-12 justify-center ${when === 'later' ? 'chip-on' : ''}`}>Agendar</button>
        </div>
        {!approved && <p className="text-xs text-mist-500 mt-2">Você pode entrar ao vivo quando a loja estiver aprovada e com CNPJ ativo. Por enquanto, agende.</p>}
        {when === 'later' && <input type="datetime-local" className="input mt-3" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().slice(0, 16)} aria-label="Data e hora" />}
      </div>

      <button disabled={busy} className="btn btn-primary w-full md:w-auto">{busy ? 'Preparando…' : when === 'now' ? 'Entrar ao vivo' : 'Agendar live'}</button>
    </form>
  )
}
