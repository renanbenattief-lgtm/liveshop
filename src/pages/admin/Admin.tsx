import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { must, useAsync } from '@/lib/useAsync'
import { compact, elapsed } from '@/lib/format'
import type { Category, Live, Store } from '@/lib/types'
import { Empty, Field, OnAir, Rating, Spinner, StoreAvatar, Toggle } from '@/components/ui'
import { TagInput } from '@/components/inputs'
import { CATEGORY_ICONS, CategoryIcon } from '@/components/CategoryIcon'

const tabs = [
  { to: '/admin', label: 'Visão geral', end: true },
  { to: '/admin/lojas', label: 'Lojas' },
  { to: '/admin/lives', label: 'Lives' },
  { to: '/admin/categorias', label: 'Categorias' },
  { to: '/admin/configuracoes', label: 'Configurações' },
]

export function AdminLayout() {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 pt-5 md:pt-8">
      <p className="text-xs text-mist-400">Administração</p>
      <h1 className="text-3xl font-extrabold mb-4">LIVESHOP</h1>
      <nav className="flex gap-1 overflow-x-auto no-scrollbar border-b border-ink-700 mb-6 -mx-4 px-4 md:mx-0 md:px-0">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `px-4 h-11 inline-flex items-center text-sm font-semibold border-b-2 -mb-px whitespace-nowrap ${isActive ? 'border-cool text-mist' : 'border-transparent text-mist-400 hover:text-mist'}`}>{t.label}</NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}

export function AdminOverview() {
  const { data, loading } = useAsync(async () => {
    const o = must(await supabase.rpc('admin_overview')) as Record<string, number>
    const s = must(await supabase.from('platform_settings').select('commission_percent').single()) as { commission_percent: number }
    return { ...o, commission: s.commission_percent } as Record<string, number>
  }, [])
  if (loading || !data) return <Spinner />
  const cards = [
    ['Lojas aprovadas', data.stores_approved], ['Lojas aguardando aprovação', data.stores_pending], ['Usuários', data.buyers],
    ['Produtos ativos', data.products], ['Lives ao vivo agora', data.lives_now], ['Espectadores agora', compact(data.viewers_now)],
    ['Lives agendadas', data.lives_scheduled], ['Comissão da plataforma', `${String(data.commission).replace('.', ',')}%`],
  ] as const
  return (
    <div className="pb-10">
      {data.stores_pending > 0 && (
        <Link to="/admin/lojas?status=pending" className="block rounded-2xl bg-tag text-ink px-4 py-3 mb-4 font-semibold">
          {data.stores_pending} {data.stores_pending === 1 ? 'loja aguarda' : 'lojas aguardam'} aprovação. Revisar agora
        </Link>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="font-display text-3xl font-extrabold">{value}</p>
            <p className="text-sm text-mist-400">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const STATUS: Record<Store['status'], string> = { pending: 'Em análise', approved: 'Aprovada', suspended: 'Suspensa', rejected: 'Reprovada' }

export function AdminStores() {
  const [status, setStatus] = useState<Store['status'] | 'all'>(new URLSearchParams(location.search).get('status') as Store['status'] || 'pending')
  const { data, loading, reload } = useAsync(async () => {
    let q = supabase.from('stores').select('*').order('created_at', { ascending: false })
    if (status !== 'all') q = q.eq('status', status)
    return must(await q) as Store[]
  }, [status])

  const setStoreStatus = async (s: Store, next: Store['status']) => {
    let reason: string | null = null
    if (next === 'suspended' || next === 'rejected') {
      reason = window.prompt(`Motivo (aparece para o lojista ${s.name}):`) ?? null
      if (reason === null) return
    }
    const { error } = await supabase.from('stores').update({ status: next, status_reason: reason }).eq('id', s.id)
    if (error) return toast.error(error.message)
    toast.success(`${s.name}: ${STATUS[next].toLowerCase()}`)
    reload()
  }

  return (
    <div className="pb-10">
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
        {(['pending', 'approved', 'suspended', 'rejected', 'all'] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`chip ${status === s ? 'chip-on' : ''}`}>{s === 'all' ? 'Todas' : STATUS[s]}</button>
        ))}
      </div>
      {loading ? <Spinner /> : !data?.length ? <Empty title="Nenhuma loja aqui" /> : (
        <ul className="space-y-2">
          {data.map((s) => (
            <li key={s.id} className="card p-4">
              <div className="flex items-start gap-3">
                <StoreAvatar name={s.name} url={s.logo_url} size={48} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{s.name} <span className="text-xs text-mist-400 ml-1">{STATUS[s.status]}</span></p>
                  <p className="text-sm text-mist-400">{s.city}/{s.state} · {s.document_type?.toUpperCase()} {s.document ?? '—'} · {s.phone ?? 'sem telefone'}</p>
                  {s.description && <p className="text-sm text-mist-300 mt-1 line-clamp-2">{s.description}</p>}
                  {s.status_reason && <p className="text-xs text-onair mt-1">Motivo: {s.status_reason}</p>}
                  <div className="mt-1"><Rating value={s.rating} count={s.rating_count} /></div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {s.status !== 'approved' && <button onClick={() => setStoreStatus(s, 'approved')} className="btn btn-sm bg-cool text-ink">Aprovar</button>}
                {s.status === 'pending' && <button onClick={() => setStoreStatus(s, 'rejected')} className="btn btn-sm btn-outline">Reprovar</button>}
                {s.status === 'approved' && <button onClick={() => setStoreStatus(s, 'suspended')} className="btn btn-sm btn-outline text-onair">Suspender</button>}
                {s.status === 'approved' && <Link to={`/loja/${s.slug}`} className="btn btn-sm btn-ghost">Ver loja</Link>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function AdminLives() {
  const { data, loading, reload } = useAsync(async () =>
    must(await supabase.from('lives').select('*, stores(name, slug, logo_url)').eq('status', 'live').order('viewers_count', { ascending: false })) as (Live & { stores: Pick<Store, 'name' | 'slug' | 'logo_url'> })[], [])
  const end = async (l: Live) => {
    if (!window.confirm(`Encerrar a live "${l.title}"?`)) return
    const { error } = await supabase.rpc('end_live', { p_live: l.id })
    if (error) return toast.error(error.message)
    toast.success('Live encerrada'); reload()
  }
  if (loading) return <Spinner />
  if (!data?.length) return <Empty title="Nenhuma live no ar agora" />
  return (
    <ul className="space-y-2 pb-10">
      {data.map((l) => (
        <li key={l.id} className="card p-3 flex items-center gap-3">
          <div className="h-16 w-11 rounded-xl overflow-hidden bg-ink-700 shrink-0">{l.cover_url && <img src={l.cover_url} alt="" className="h-full w-full object-cover" />}</div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{l.title}</p>
            <p className="text-sm text-mist-400">{l.stores.name} · {elapsed(l.started_at)}</p>
          </div>
          <OnAir viewers={l.viewers_count} small />
          <Link to={`/live/${l.id}`} className="btn btn-sm btn-ghost">Assistir</Link>
          <button onClick={() => end(l)} className="btn btn-sm btn-outline text-onair">Encerrar</button>
        </li>
      ))}
    </ul>
  )
}

export function AdminCategories() {
  const { data, loading, reload } = useAsync(async () => must(await supabase.from('categories').select('*').order('sort_order')) as Category[], [])
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('tag')
  const [adult, setAdult] = useState(false)

  const add = async (e: FormEvent) => {
    e.preventDefault()
    const slug = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const { error } = await supabase.from('categories').insert({ name, slug, icon, is_adult: adult, sort_order: (data?.length ?? 0) })
    if (error) return toast.error(error.message)
    setName(''); setAdult(false); reload()
  }
  const del = async (c: Category) => {
    if (!window.confirm(`Excluir a categoria ${c.name}?`)) return
    const { error } = await supabase.from('categories').delete().eq('id', c.id)
    if (error) toast.error('Não foi possível excluir: há lojas ou produtos usando esta categoria.'); else reload()
  }

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-6 pb-10">
      {loading ? <Spinner /> : (
        <ul className="card divide-y divide-ink-700">
          {data?.map((c) => (
            <li key={c.id} className="flex items-center gap-3 p-3">
              <span className="h-9 w-9 rounded-full bg-ink-700 inline-flex items-center justify-center text-tag"><CategoryIcon name={c.icon} size={17} /></span>
              <span className="flex-1">{c.name} <span className="text-xs text-mist-500">/{c.slug}</span></span>
              {c.is_adult && <span className="text-xs font-semibold text-onair">+18 (oculta)</span>}
              <button onClick={() => del(c)} className="text-sm text-mist-400 hover:text-onair">Excluir</button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="card p-4 space-y-3 self-start">
        <h2 className="font-bold">Nova categoria</h2>
        <Field label="Nome"><input className="input" required value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div>
          <p className="field-label">Ícone</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_ICONS.map((i) => (
              <button type="button" key={i} onClick={() => setIcon(i)} aria-label={i} className={`h-9 w-9 rounded-full inline-flex items-center justify-center ${icon === i ? 'bg-tag text-ink' : 'bg-ink-700'}`}><CategoryIcon name={i} size={16} /></button>
            ))}
          </div>
        </div>
        <Toggle label="Categoria +18" hint="Fica fora da busca até a área adulta separada ser lançada" checked={adult} onChange={setAdult} />
        <button className="btn btn-primary w-full">Adicionar</button>
      </form>
    </div>
  )
}

export function AdminSettings() {
  const { data, loading } = useAsync(async () => must(await supabase.from('platform_settings').select('*').single()) as { commission_percent: number; featured_hashtags: string[]; admin_emails: string[] }, [])
  const [commission, setCommission] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [admins, setAdmins] = useState('')
  useEffect(() => {
    if (!data) return
    setCommission(String(data.commission_percent)); setTags(data.featured_hashtags); setAdmins(data.admin_emails.join(', '))
  }, [data])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('platform_settings').update({
      commission_percent: Number(commission.replace(',', '.')), featured_hashtags: tags,
      admin_emails: admins.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean), updated_at: new Date().toISOString(),
    }).eq('id', 1)
    if (error) toast.error(error.message); else toast.success('Configurações salvas')
  }

  if (loading) return <Spinner />
  return (
    <form onSubmit={save} className="max-w-xl space-y-5 pb-12">
      <Field label="Comissão padrão da plataforma (%)" hint="Percentual retido de cada venda. Entra em vigor com o checkout (fase 3).">
        <input className="input" inputMode="decimal" value={commission} onChange={(e) => setCommission(e.target.value)} />
      </Field>
      <Field label="Hashtags em destaque na home" hint="Aparecem primeiro na lista de hashtags em alta">
        <TagInput value={tags} onChange={setTags} />
      </Field>
      <Field label="E-mails de administradores" hint="Quem criar conta com um destes e-mails vira admin automaticamente. Separe por vírgula.">
        <textarea className="input" value={admins} onChange={(e) => setAdmins(e.target.value)} />
      </Field>
      <button className="btn btn-primary">Salvar configurações</button>
    </form>
  )
}
