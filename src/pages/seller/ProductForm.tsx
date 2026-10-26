import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { must, useAsync } from '@/lib/useAsync'
import { useAuth } from '@/lib/auth'
import { PRODUCT_SELECT, getCategories } from '@/lib/api'
import type { Product } from '@/lib/types'
import { Field, Spinner, Toggle } from '@/components/ui'
import { ImagePicker, TagInput } from '@/components/inputs'

interface Variant { name: string; value: string; stock: string }
const num = (s: string) => Number(String(s).replace(',', '.'))

export default function ProductForm() {
  const { id } = useParams()
  const isNew = !id || id === 'novo'
  const navigate = useNavigate()
  const { store } = useAuth()
  const cats = useAsync(getCategories, [])
  const existing = useAsync(async () => isNew ? null : must(await supabase.from('products').select(PRODUCT_SELECT).eq('id', id!).single()) as Product, [id])

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [promo, setPromo] = useState('')
  const [stock, setStock] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [images, setImages] = useState<string[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [active, setActive] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const p = existing.data
    if (p) {
      setName(p.name); setDescription(p.description ?? ''); setPrice(String(p.price)); setPromo(p.promo_price != null ? String(p.promo_price) : '')
      setStock(String(p.stock)); setCategory(p.category_id ?? ''); setActive(p.active)
      setTags((p.product_hashtags ?? []).map((h) => h.hashtags?.tag).filter(Boolean) as string[])
      setImages([...(p.product_images ?? [])].sort((a, b) => a.position - b.position).map((i) => i.url))
      setVariants((p.product_variants ?? []).map((v) => ({ name: v.name, value: v.value, stock: String(v.stock) })))
    } else if (isNew && store) setCategory(store.category_id ?? '')
  }, [existing.data, isNew, store])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!store) return
    if (!tags.length) return toast.error('Adicione pelo menos uma hashtag', { description: 'É por elas que o comprador encontra seu produto.' })
    if (promo && num(promo) >= num(price)) return toast.error('O preço promocional precisa ser menor que o preço normal')
    setBusy(true)
    try {
      const totalVariantStock = variants.reduce((a, v) => a + (parseInt(v.stock) || 0), 0)
      const payload = {
        store_id: store.id, name: name.trim(), description, price: num(price), promo_price: promo ? num(promo) : null,
        stock: variants.length ? totalVariantStock : parseInt(stock) || 0, category_id: category || null, active,
      }
      const saved = isNew
        ? must(await supabase.from('products').insert(payload).select('id').single()) as { id: string }
        : must(await supabase.from('products').update(payload).eq('id', id!).select('id').single()) as { id: string }

      await supabase.from('product_images').delete().eq('product_id', saved.id)
      if (images.length) must(await supabase.from('product_images').insert(images.map((url, position) => ({ product_id: saved.id, url, position }))))
      await supabase.from('product_variants').delete().eq('product_id', saved.id)
      const vs = variants.filter((v) => v.value.trim())
      if (vs.length) must(await supabase.from('product_variants').insert(vs.map((v) => ({ product_id: saved.id, name: v.name.trim() || 'Opção', value: v.value.trim(), stock: parseInt(v.stock) || 0 }))))
      must(await supabase.rpc('set_product_tags', { p_product: saved.id, p_tags: tags }))

      toast.success(isNew ? 'Produto cadastrado' : 'Produto atualizado')
      navigate('/vendedor/produtos')
    } catch (err) {
      toast.error('Não foi possível salvar', { description: err instanceof Error ? err.message : '' })
    } finally { setBusy(false) }
  }

  const remove = async () => {
    if (!id || isNew) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Produto excluído'); navigate('/vendedor/produtos')
  }

  if (!isNew && existing.loading) return <Spinner />

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5 pb-12">
      <div className="flex items-center gap-3">
        <Link to="/vendedor/produtos" className="h-10 w-10 rounded-full bg-ink-700 inline-flex items-center justify-center" aria-label="Voltar"><ArrowLeft size={18} /></Link>
        <h1 className="text-2xl font-extrabold">{isNew ? 'Novo produto' : 'Editar produto'}</h1>
      </div>

      <Field label="Fotos" hint="Até 8 fotos. A primeira é a capa."><ImagePicker value={images} onChange={setImages} folder="products" max={8} /></Field>
      <Field label="Nome do produto"><input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Blusa de frio tricô gola alta" /></Field>
      <Field label="Hashtags" hint="Use as palavras que o comprador digitaria na busca. Aperte Enter para adicionar."><TagInput value={tags} onChange={setTags} /></Field>
      <Field label="Descrição"><textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Material, medidas, cuidados" /></Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Preço (R$)"><input className="input" required inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="129,90" /></Field>
        <Field label="Preço promocional (R$)" hint="Opcional"><input className="input" inputMode="decimal" value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="99,90" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoria">
          <select className="input px-3" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">—</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Estoque" hint={variants.length ? 'Somado das variações' : undefined}>
          <input className="input" inputMode="numeric" disabled={variants.length > 0} value={variants.length ? variants.reduce((a, v) => a + (parseInt(v.stock) || 0), 0) : stock} onChange={(e) => setStock(e.target.value)} />
        </Field>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="field-label mb-0">Variações (tamanho, cor…)</span>
          <button type="button" onClick={() => setVariants([...variants, { name: variants[0]?.name ?? 'Tamanho', value: '', stock: '' }])} className="btn btn-ghost btn-sm"><Plus size={15} /> Adicionar</button>
        </div>
        {variants.map((v, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_80px_40px] gap-2 mb-2">
            <input className="input" value={v.name} placeholder="Tamanho" aria-label="Tipo" onChange={(e) => setVariants(variants.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
            <input className="input" value={v.value} placeholder="M" aria-label="Valor" onChange={(e) => setVariants(variants.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
            <input className="input px-3" value={v.stock} placeholder="Qtd" inputMode="numeric" aria-label="Estoque" onChange={(e) => setVariants(variants.map((x, j) => j === i ? { ...x, stock: e.target.value } : x))} />
            <button type="button" onClick={() => setVariants(variants.filter((_, j) => j !== i))} className="text-mist-500 hover:text-onair" aria-label="Remover variação"><Trash2 size={18} /></button>
          </div>
        ))}
      </div>

      <Toggle label="Produto ativo" hint="Produtos pausados não aparecem na loja nem nas lives" checked={active} onChange={setActive} />

      <div className="flex flex-wrap gap-2 pt-2">
        <button disabled={busy} className="btn btn-primary">{busy ? 'Salvando…' : 'Salvar produto'}</button>
        {!isNew && <button type="button" onClick={remove} className="btn btn-outline text-onair">Excluir</button>}
      </div>
    </form>
  )
}
