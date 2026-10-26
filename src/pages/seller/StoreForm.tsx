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
import { BadgeCheck, Loader2, ShieldAlert } from 'lucide-react'
import { type CnpjResult, checkCnpj, cnpjIsValid, formatCnpj, onlyDigits, verifyStoreCnpj } from '@/lib/cnpj'

type Form = Pick<Store, 'name' | 'slug' | 'description' | 'document' | 'document_type' | 'phone' | 'cep' | 'city' | 'state' | 'category_id'> & { logo: string[]; cover: string[] }

const toForm = (s?: Store | null): Form => ({
  name: s?.name ?? '', slug: s?.slug ?? '', description: s?.description ?? '', document: s?.document ?? '',
  document_type: 'cnpj', phone: s?.phone ?? '', cep: s?.cep ?? '', city: s?.city ?? '',
  state: s?.state ?? 'SP', category_id: s?.category_id ?? null,
  logo: s?.logo_url ? [s.logo_url] : [], cover: s?.cover_url ? [s.cover_url] : [],
})

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())

/** Formulário de dados da loja (criação e edição). */
export function StoreForm({ store, onSaved }: { store?: Store | null; onSaved: (s: Store) => void }) {
  const { user, refresh } = useAuth()
  const [f, setF] = useState<Form>(toForm(store))
  const [slugTouched, setSlugTouched] = useState(!!store)
  const [busy, setBusy] = useState(false)
  const cats = useAsync(getCategories, [])
  useEffect(() => setF(toForm(store)), [store])
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }))

  // CNPJ: precisa ser válido e estar ATIVO na Receita
  const [cnpj, setCnpj] = useState<CnpjResult | null>(null)
  const [checking, setChecking] = useState(false)
  const sameAsSaved = !!store?.document && onlyDigits(f.document ?? '') === store.document
  const savedActive = sameAsSaved && (store?.cnpj_status ?? '').toUpperCase() === 'ATIVA'

  const runCheck = async (value = f.document ?? '') => {
    if (!cnpjIsValid(value)) { setCnpj({ ok: false, error: 'CNPJ inválido. Confira os números.' }); return null }
    setChecking(true)
    const r = await checkCnpj(value)
    setChecking(false)
    setCnpj(r)
    if (r.ok && !store) {
      // preenche o que estiver vazio com os dados da Receita
      setF((x) => ({
        ...x,
        name: x.name || titleCase(r.trade_name ?? ''),
        slug: x.name || slugTouched ? x.slug : slugify(r.trade_name ?? ''),
        city: x.city || titleCase(r.city ?? ''),
        state: r.uf || x.state,
      }))
    }
    return r
  }

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
    if (!cnpjIsValid(f.document ?? '')) return toast.error('CNPJ inválido. Confira os números.')
    if (!savedActive) {
      const r = cnpj && onlyDigits(f.document ?? '') ? cnpj : await runCheck()
      if (r && !r.ok && !r.unavailable) {
        return toast.error('Só aceitamos lojas com CNPJ ATIVO na Receita Federal', { description: r.error ?? `Situação atual: ${r.status}` })
      }
    }
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
      toast.error(error.message.includes('stores_slug_key') ? 'Esse endereço de loja já está em uso. Escolha outro.'
        : error.message.includes('stores_document_unique') ? 'Este CNPJ já está cadastrado em outra loja.' : error.message)
      return
    }
    // grava a situação do CNPJ na loja (a consulta oficial é feita no servidor)
    if (!savedActive) {
      const v = await verifyStoreCnpj()
      if (v.unavailable) toast('A Receita não respondeu agora', { description: 'Sua loja foi salva. Tente "Verificar CNPJ" de novo em alguns minutos.' })
      else if (!v.ok) toast.error('CNPJ não está ativo', { description: v.error ?? `Situação: ${v.status}` })
    }
    await refresh()
    onSaved(data as Store)
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <Field label="CNPJ da loja" hint="Para vender no LIVESHOP o CNPJ precisa estar ATIVO na Receita Federal.">
          <div className="flex flex-col sm:flex-row gap-2">
            <input className="input w-full sm:flex-1 min-w-0 tracking-wide" required inputMode="numeric" placeholder="00.000.000/0000-00" value={formatCnpj(f.document)}
              onChange={(e) => { set({ document: onlyDigits(e.target.value) }); setCnpj(null) }}
              onBlur={(e) => { if (onlyDigits(e.target.value).length === 14 && !savedActive) runCheck(e.target.value) }} />
            <button type="button" onClick={() => runCheck()} disabled={checking} className="btn btn-ghost shrink-0 px-5 self-start sm:self-auto">
              {checking ? <><Loader2 size={18} className="animate-spin" /> Consultando</> : 'Verificar na Receita'}
            </button>
          </div>
        </Field>
        {savedActive && !cnpj && (
          <p className="mt-2 text-sm text-cool inline-flex items-center gap-1.5"><BadgeCheck size={16} /> CNPJ ativo · {store?.cnpj_legal_name}</p>
        )}
        {cnpj && (
          <div className={`mt-2 rounded-2xl border p-3 text-sm ${cnpj.ok ? 'border-cool/50 bg-cool/10' : 'border-onair/50 bg-onair/10'}`} role="status">
            {cnpj.ok ? (
              <>
                <p className="font-semibold text-cool inline-flex items-center gap-1.5"><BadgeCheck size={16} /> CNPJ ATIVO na Receita</p>
                <p className="mt-1">{cnpj.legal_name}</p>
                <p className="text-mist-400">{[cnpj.trade_name, cnpj.city && `${cnpj.city}/${cnpj.uf}`].filter(Boolean).join(' · ')}</p>
              </>
            ) : (
              <>
                <p className="font-semibold inline-flex items-center gap-1.5"><ShieldAlert size={16} className="text-onair" />
                  {cnpj.status ? `Situação na Receita: ${cnpj.status}` : 'Não foi possível validar'}</p>
                <p className="mt-1 text-mist-300">{cnpj.error ?? (cnpj.legal_name ? `${cnpj.legal_name}. ` : '') + 'Só lojas com CNPJ ATIVO podem vender. Regularize na Receita e tente de novo.'}</p>
              </>
            )}
          </div>
        )}
      </div>
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
