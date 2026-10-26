import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { getCategories } from '@/lib/api'
import { useAsync } from '@/lib/useAsync'
import { UFS, slugify } from '@/lib/format'
import type { Store } from '@/lib/types'
import { Field } from '@/components/ui'
import { ImagePicker } from '@/components/inputs'

type Form = Pick<Store, 'name' | 'slug' | 'description' | 'document' | 'document_type' | 'phone' | 'cep' | 'city' | 'state' | 'category_id'> & { logo: string[]; cover: string[] }

const toForm = (s?: Store | null): Form => ({
  name: s?.name ?? '', slug: s?.slug ?? '', description: s?.description ?? '', document: s?.document ?? '',
  document_type: s?.document_type ?? 'cnpj', phone: s?.phone ?? '', cep: s?.cep ?? '', city: s?.city ?? '',
  state: s?.state ?? 'SP', category_id: s?.category_id ?? null,
  logo: s?.logo_url ? [s.logo_url] : [], cover: s?.cover_url ? [s.cover_url] : [],
})

/** Formulário de dados da loja (criação e edição). */
export function StoreForm({ store, onSaved }: { store?: Store | null; onSaved: (s: Store) => void }) {
  const { user, refresh } = useAuth()
  const [f, setF] = useState<Form>(toForm(store))
  const [slugTouched, setSlugTouched] = useState(!!store)
  const [busy, setBusy] = useState(false)
  const cats = useAsync(getCategories, [])
  useEffect(() => setF(toForm(store)), [store])
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }))

  const lookupCep = async (cep: string) => {
    const clean = cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`).then((x) => x.json())
      if (!r.erro) set({ city: r.localidade, state: r.uf })
    } catch { /* ignora */ }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    const payload = {
      name: f.name.trim(), slug: slugify(f.slug || f.name), description: f.description, document: f.document?.replace(/\D/g, '') || null,
      document_type: f.document_type, phone: f.phone, cep: f.cep, city: f.city.trim(), state: f.state, category_id: f.category_id || null,
      logo_url: f.logo[0] ?? null, cover_url: f.cover[0] ?? null,
    }
    const q = store
      ? supabase.from('stores').update(payload).eq('id', store.id).select().single()
      : supabase.from('stores').insert({ ...payload, owner_id: user.id }).select().single()
    const { data, error } = await q
    setBusy(false)
    if (error) {
      toast.error(error.message.includes('stores_slug_key') ? 'Esse endereço de loja já está em uso. Escolha outro.' : error.message)
      return
    }
    await refresh()
    onSaved(data as Store)
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-[96px_1fr] gap-4 items-start">
        <Field label="Logo"><ImagePicker value={f.logo} onChange={(v) => set({ logo: v })} folder="store" /></Field>
        <Field label="Capa"><ImagePicker value={f.cover} onChange={(v) => set({ cover: v })} folder="store" aspect="wide" /></Field>
      </div>
      <Field label="Nome da loja">
        <input className="input" required value={f.name} onChange={(e) => set({ name: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })} />
      </Field>
      <Field label="Endereço da loja" hint={`liveshop/loja/${slugify(f.slug || f.name) || 'sua-loja'}`}>
        <input className="input" required value={f.slug} onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value }) }} />
      </Field>
      <Field label="Descrição"><textarea className="input" value={f.description ?? ''} onChange={(e) => set({ description: e.target.value })} placeholder="O que você vende, horários das lives, diferenciais" /></Field>
      <Field label="Categoria principal">
        <select className="input px-3" required value={f.category_id ?? ''} onChange={(e) => set({ category_id: e.target.value })}>
          <option value="" disabled>Escolha</option>
          {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-[110px_1fr] gap-2">
        <Field label="Documento">
          <select className="input px-3" value={f.document_type ?? 'cnpj'} onChange={(e) => set({ document_type: e.target.value as 'cpf' | 'cnpj' })}>
            <option value="cnpj">CNPJ</option><option value="cpf">CPF</option>
          </select>
        </Field>
        <Field label="Número"><input className="input" required inputMode="numeric" value={f.document ?? ''} onChange={(e) => set({ document: e.target.value })} /></Field>
      </div>
      <Field label="WhatsApp / telefone"><input className="input" inputMode="tel" value={f.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} /></Field>
      <div>
        <p className="field-label">Endereço de onde saem os envios</p>
        <div className="grid grid-cols-[1fr_1.4fr_84px] gap-2">
          <input className="input" placeholder="CEP" inputMode="numeric" value={f.cep ?? ''} onChange={(e) => set({ cep: e.target.value })} onBlur={(e) => lookupCep(e.target.value)} aria-label="CEP" />
          <input className="input" placeholder="Cidade" required value={f.city} onChange={(e) => set({ city: e.target.value })} aria-label="Cidade" />
          <select className="input px-2" value={f.state} onChange={(e) => set({ state: e.target.value })} aria-label="Estado">{UFS.map((u) => <option key={u}>{u}</option>)}</select>
        </div>
      </div>
      <button disabled={busy} className="btn btn-primary w-full md:w-auto">{busy ? 'Salvando…' : store ? 'Salvar alterações' : 'Enviar loja para aprovação'}</button>
    </form>
  )
}
