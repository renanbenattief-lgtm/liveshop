import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Bell, ChevronRight, LogOut, MapPin, Shield, Store, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { must, useAsync } from '@/lib/useAsync'
import { useAuth } from '@/lib/auth'
import { UFS } from '@/lib/format'
import { Empty, Field, Sheet, Spinner, StoreAvatar } from '@/components/ui'

interface Address { id: string; label: string; recipient: string | null; cep: string; street: string; number: string; complement: string | null; district: string | null; city: string; state: string; is_default: boolean }
const emptyAddr = { label: 'Casa', recipient: '', cep: '', street: '', number: '', complement: '', district: '', city: '', state: 'SP', is_default: false }

export default function Account() {
  const { user, profile, store, isAdmin, loading, refresh, signOut } = useAuth()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [uf, setUf] = useState('')
  const [city, setCity] = useState('')
  const [addrOpen, setAddrOpen] = useState(false)
  const [addr, setAddr] = useState(emptyAddr)

  useEffect(() => {
    setName(profile?.full_name ?? ''); setPhone(profile?.phone ?? ''); setUf(profile?.state ?? ''); setCity(profile?.city ?? '')
  }, [profile])

  const addresses = useAsync(async () => user
    ? must(await supabase.from('addresses').select('*').eq('user_id', user.id).order('created_at')) as Address[]
    : [], [user?.id])
  const reminders = useAsync(async () => user
    ? must(await supabase.from('live_reminders').select('id, stores(name, slug, logo_url)').eq('user_id', user.id)) as unknown as { id: string; stores: { name: string; slug: string; logo_url: string | null } | null }[]
    : [], [user?.id])

  if (loading) return <Spinner />
  if (!user) return (
    <Empty title="Sua conta no LIVESHOP" action={<div className="flex gap-2"><Link to="/entrar" className="btn btn-primary">Entrar</Link><Link to="/entrar?modo=cadastro" className="btn btn-ghost">Criar conta</Link></div>}>
      Entre para seguir lojas, receber avisos de live e comprar.
    </Empty>
  )

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('profiles').update({ full_name: name, phone, state: uf || null, city: city || null }).eq('id', user.id)
    if (error) toast.error(error.message); else { toast.success('Dados salvos'); refresh() }
  }

  const lookupCep = async (cep: string) => {
    const clean = cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`).then((x) => x.json())
      if (!r.erro) setAddr((a) => ({ ...a, street: r.logradouro || a.street, district: r.bairro || a.district, city: r.localidade || a.city, state: r.uf || a.state }))
    } catch { /* sem internet ou CEP inválido */ }
  }

  const saveAddr = async (e: FormEvent) => {
    e.preventDefault()
    if (addr.is_default) await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id)
    const { error } = await supabase.from('addresses').insert({ ...addr, user_id: user.id, is_default: addr.is_default || !addresses.data?.length })
    if (error) return toast.error(error.message)
    toast.success('Endereço adicionado'); setAddrOpen(false); setAddr(emptyAddr); addresses.reload()
  }

  const delAddr = async (id: string) => { await supabase.from('addresses').delete().eq('id', id); addresses.reload() }
  const delReminder = async (id: string) => { await supabase.from('live_reminders').delete().eq('id', id); reminders.reload() }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6 space-y-6">
      <div className="flex items-center gap-4">
        <StoreAvatar name={profile?.full_name || user.email || '?'} url={profile?.avatar_url} size={64} />
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold truncate">{profile?.full_name || 'Minha conta'}</h1>
          <p className="text-sm text-mist-400 truncate">{user.email}</p>
        </div>
      </div>

      <div className="card divide-y divide-ink-700">
        <Link to={store ? '/vendedor' : '/vender'} className="flex items-center gap-3 p-4">
          <Store size={20} className="text-tag" />
          <span className="flex-1"><span className="block font-semibold">{store ? store.name : 'Abrir minha loja'}</span>
            <span className="block text-sm text-mist-400">{store ? 'Painel do vendedor' : 'Venda ao vivo no LIVESHOP'}</span></span>
          <ChevronRight size={18} className="text-mist-500" />
        </Link>
        {isAdmin && (
          <Link to="/admin" className="flex items-center gap-3 p-4">
            <Shield size={20} className="text-cool" />
            <span className="flex-1 font-semibold">Administração da plataforma</span>
            <ChevronRight size={18} className="text-mist-500" />
          </Link>
        )}
      </div>

      <form onSubmit={saveProfile} className="card p-4 space-y-4">
        <h2 className="text-lg font-bold">Meus dados</h2>
        <Field label="Nome"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Telefone"><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="(11) 99999-9999" /></Field>
        <div className="grid grid-cols-[96px_1fr] gap-2">
          <Field label="Estado">
            <select className="input px-3" value={uf} onChange={(e) => setUf(e.target.value)}><option value="">—</option>{UFS.map((u) => <option key={u}>{u}</option>)}</select>
          </Field>
          <Field label="Cidade"><input className="input" value={city} onChange={(e) => setCity(e.target.value)} /></Field>
        </div>
        <p className="text-xs text-mist-500">Seu estado é usado para mostrar primeiro as lojas mais próximas.</p>
        <button className="btn btn-ghost">Salvar dados</button>
      </form>

      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Endereços</h2>
          <button onClick={() => setAddrOpen(true)} className="btn btn-ghost btn-sm">Adicionar</button>
        </div>
        {addresses.data?.length ? (
          <ul className="divide-y divide-ink-700">
            {addresses.data.map((a) => (
              <li key={a.id} className="flex items-start gap-3 py-3">
                <MapPin size={18} className="text-mist-400 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold">{a.label}{a.is_default && <span className="ml-2 text-xs text-tag">principal</span>}</p>
                  <p className="text-mist-400">{a.street}, {a.number}{a.complement ? ` – ${a.complement}` : ''} · {a.city}/{a.state} · {a.cep}</p>
                </div>
                <button onClick={() => delAddr(a.id)} className="text-mist-500 hover:text-onair" aria-label="Remover endereço"><Trash2 size={17} /></button>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-mist-400">Nenhum endereço cadastrado. Você vai precisar de um para receber suas compras.</p>}
      </section>

      <section className="card p-4">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Bell size={18} /> Avisos de live</h2>
        {reminders.data?.length ? (
          <ul className="divide-y divide-ink-700">
            {reminders.data.map((r) => r.stores && (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <StoreAvatar name={r.stores.name} url={r.stores.logo_url} size={34} />
                <Link to={`/loja/${r.stores.slug}`} className="flex-1 font-medium">{r.stores.name}</Link>
                <button onClick={() => delReminder(r.id)} className="text-sm text-mist-400 hover:text-mist">Desativar</button>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-mist-400">Use “Me avise quando entrar ao vivo” na página de uma loja.</p>}
      </section>

      <button onClick={signOut} className="btn btn-outline w-full"><LogOut size={18} /> Sair</button>

      <Sheet open={addrOpen} onClose={() => setAddrOpen(false)} title="Novo endereço">
        <form onSubmit={saveAddr} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Nome do endereço"><input className="input" value={addr.label} onChange={(e) => setAddr({ ...addr, label: e.target.value })} /></Field>
            <Field label="CEP"><input className="input" value={addr.cep} inputMode="numeric" required onChange={(e) => setAddr({ ...addr, cep: e.target.value })} onBlur={(e) => lookupCep(e.target.value)} /></Field>
          </div>
          <Field label="Destinatário"><input className="input" value={addr.recipient} onChange={(e) => setAddr({ ...addr, recipient: e.target.value })} /></Field>
          <Field label="Rua"><input className="input" value={addr.street} required onChange={(e) => setAddr({ ...addr, street: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Número"><input className="input" value={addr.number} required onChange={(e) => setAddr({ ...addr, number: e.target.value })} /></Field>
            <Field label="Complemento"><input className="input" value={addr.complement} onChange={(e) => setAddr({ ...addr, complement: e.target.value })} /></Field>
          </div>
          <Field label="Bairro"><input className="input" value={addr.district} onChange={(e) => setAddr({ ...addr, district: e.target.value })} /></Field>
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <Field label="Cidade"><input className="input" value={addr.city} required onChange={(e) => setAddr({ ...addr, city: e.target.value })} /></Field>
            <Field label="UF"><select className="input px-3" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })}>{UFS.map((u) => <option key={u}>{u}</option>)}</select></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={addr.is_default} onChange={(e) => setAddr({ ...addr, is_default: e.target.checked })} className="accent-[#FFD23F] h-4 w-4" /> Usar como principal</label>
          <button className="btn btn-primary w-full">Salvar endereço</button>
        </form>
      </Sheet>
    </div>
  )
}
