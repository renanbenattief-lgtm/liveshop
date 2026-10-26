import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, Search as SearchIcon, SlidersHorizontal, X } from 'lucide-react'
import { CardGrid, LiveCard, StoreRow } from '@/components/cards'
import { Empty, ErrorBox, Sheet, Spinner, Toggle } from '@/components/ui'
import { getCategories, searchLives, searchStores } from '@/lib/api'
import { useAsync } from '@/lib/useAsync'
import { useAuth } from '@/lib/auth'
import { UFS, normalizeTag } from '@/lib/format'
import type { SearchFilters } from '@/lib/types'

const SORTS: { v: SearchFilters['sort']; label: string }[] = [
  { v: 'viewers', label: 'Mais assistidas' },
  { v: 'nearest', label: 'Mais próximas' },
  { v: 'rating', label: 'Melhor avaliadas' },
  { v: 'price', label: 'Menor preço' },
]

function readFilters(sp: URLSearchParams): SearchFilters {
  return {
    q: sp.get('q') ?? '',
    freeShipping: sp.get('frete') === '1',
    fast: sp.get('rapida') === '1',
    state: sp.get('uf') ?? '',
    city: sp.get('cidade') ?? '',
    minPrice: sp.get('min') ?? '',
    maxPrice: sp.get('max') ?? '',
    minRating: sp.get('nota') ?? '',
    onlyLive: sp.get('aovivo') === '1',
    category: sp.get('categoria') ?? '',
    sort: (sp.get('ordem') as SearchFilters['sort']) || 'viewers',
  }
}

function writeFilters(f: SearchFilters) {
  const sp = new URLSearchParams()
  if (f.q) sp.set('q', f.q)
  if (f.freeShipping) sp.set('frete', '1')
  if (f.fast) sp.set('rapida', '1')
  if (f.state) sp.set('uf', f.state)
  if (f.city) sp.set('cidade', f.city)
  if (f.minPrice) sp.set('min', f.minPrice)
  if (f.maxPrice) sp.set('max', f.maxPrice)
  if (f.minRating) sp.set('nota', f.minRating)
  if (f.onlyLive) sp.set('aovivo', '1')
  if (f.category) sp.set('categoria', f.category)
  if (f.sort !== 'viewers') sp.set('ordem', f.sort)
  return sp
}

function FilterForm({ f, set, cats }: { f: SearchFilters; set: (p: Partial<SearchFilters>) => void; cats: { slug: string; name: string }[] }) {
  return (
    <div className="divide-y divide-ink-700">
      <Toggle label="Somente ao vivo agora" checked={f.onlyLive} onChange={(v) => set({ onlyLive: v })} />
      <Toggle label="Frete grátis" hint="Lojas com frete grátis disponível" checked={f.freeShipping} onChange={(v) => set({ freeShipping: v })} />
      <Toggle label="Entrega rápida" hint="Envio em até 48 horas" checked={f.fast} onChange={(v) => set({ fast: v })} />
      <div className="py-4 grid grid-cols-[96px_1fr] gap-2">
        <div>
          <span className="field-label">Estado</span>
          <select className="input px-3" value={f.state} onChange={(e) => set({ state: e.target.value })}>
            <option value="">Todos</option>
            {UFS.map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <span className="field-label">Cidade</span>
          <input className="input" value={f.city} onChange={(e) => set({ city: e.target.value })} placeholder="Ex: Curitiba" />
        </div>
      </div>
      <div className="py-4">
        <span className="field-label">Faixa de preço</span>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" inputMode="decimal" placeholder="Mín. R$" value={f.minPrice} onChange={(e) => set({ minPrice: e.target.value })} aria-label="Preço mínimo" />
          <input className="input" inputMode="decimal" placeholder="Máx. R$" value={f.maxPrice} onChange={(e) => set({ maxPrice: e.target.value })} aria-label="Preço máximo" />
        </div>
      </div>
      <div className="py-4">
        <span className="field-label">Avaliação mínima da loja</span>
        <div className="flex flex-wrap gap-2">
          {['', '4', '4.5', '4.8'].map((v) => (
            <button key={v} type="button" onClick={() => set({ minRating: v })} className={`chip ${f.minRating === v ? 'chip-on' : ''}`}>
              {v ? `${v.replace('.', ',')}+ ★` : 'Todas'}
            </button>
          ))}
        </div>
      </div>
      <div className="py-4">
        <span className="field-label">Categoria</span>
        <select className="input px-3" value={f.category} onChange={(e) => set({ category: e.target.value })}>
          <option value="">Todas</option>
          {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </div>
    </div>
  )
}

export default function Search({ liveOnly }: { liveOnly?: boolean }) {
  const [sp, setSp] = useSearchParams()
  const { profile } = useAuth()
  const filters = useMemo(() => {
    const f = readFilters(sp)
    if (liveOnly) f.onlyLive = true
    return f
  }, [sp, liveOnly])
  const [draft, setDraft] = useState(filters)
  const [text, setText] = useState(filters.q)
  const [sheet, setSheet] = useState(false)
  useEffect(() => { setDraft(filters); setText(filters.q) }, [filters])

  const apply = (f: SearchFilters) => setSp(writeFilters(f), { replace: false })
  const patch = (p: Partial<SearchFilters>) => apply({ ...filters, ...p })

  const cats = useAsync(getCategories, [])
  const key = sp.toString() + String(liveOnly)
  const res = useAsync(async () => {
    const lives = await searchLives(filters, profile?.state ?? null)
    const hasLive = lives.some((l) => l.status === 'live')
    const stores = filters.q || filters.category || !hasLive ? await searchStores(filters) : []
    return { lives, stores }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, profile?.state])

  const submit = (e: FormEvent) => { e.preventDefault(); patch({ q: text.trim() }) }
  const activeCount = [filters.freeShipping, filters.fast, filters.state, filters.city, filters.minPrice || filters.maxPrice, filters.minRating, !liveOnly && filters.onlyLive, filters.category].filter(Boolean).length
  const tag = filters.q.startsWith('#') ? normalizeTag(filters.q) : ''
  const label = filters.q || cats.data?.find((c) => c.slug === filters.category)?.name || ''

  const liveNow = res.data?.lives.filter((l) => l.status === 'live') ?? []
  const upcoming = res.data?.lives.filter((l) => l.status === 'scheduled') ?? []

  const quick: { k: keyof SearchFilters; label: string }[] = [
    ...(liveOnly ? [] : [{ k: 'onlyLive' as const, label: 'Ao vivo agora' }]),
    { k: 'freeShipping', label: 'Frete grátis' },
    { k: 'fast', label: 'Entrega em 48h' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-8">
      <form onSubmit={submit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mist-500" />
          <input value={text} onChange={(e) => setText(e.target.value)} className="input rounded-full pl-11 pr-10"
            placeholder={liveOnly ? 'Filtrar lives ao vivo' : 'Busque um produto ou #hashtag'} aria-label="Buscar" autoFocus={!liveOnly && !filters.q} />
          {text && <button type="button" onClick={() => { setText(''); patch({ q: '' }) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-mist-400" aria-label="Limpar busca"><X size={18} /></button>}
        </div>
        <button type="button" onClick={() => setSheet(true)} className="md:hidden relative h-12 w-12 rounded-full bg-ink-700 inline-flex items-center justify-center" aria-label="Filtros">
          <SlidersHorizontal size={19} />
          {activeCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 rounded-full bg-tag text-ink text-[11px] font-bold inline-flex items-center justify-center">{activeCount}</span>}
        </button>
      </form>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3 -mx-4 px-4 md:mx-0 md:px-0">
        {quick.map((c) => (
          <button key={c.k} onClick={() => patch({ [c.k]: !filters[c.k] })} className={`chip ${filters[c.k] ? 'chip-on' : ''}`}>{c.label}</button>
        ))}
        <select value={filters.sort} onChange={(e) => patch({ sort: e.target.value as SearchFilters['sort'] })} className="chip appearance-none pr-4 cursor-pointer" aria-label="Ordenar">
          {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
      </div>
      {filters.sort === 'nearest' && !profile?.state && (
        <p className="text-xs text-mist-400 mt-2">Para ordenar por proximidade, informe seu estado em Perfil. Por enquanto use o filtro de estado.</p>
      )}

      <div className="md:grid md:grid-cols-[260px_1fr] md:gap-8 mt-6">
        <aside className="hidden md:block">
          <div className="sticky top-24">
            <h2 className="text-lg font-bold mb-1">Filtros</h2>
            <FilterForm f={filters} set={patch} cats={cats.data ?? []} />
          </div>
        </aside>

        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold mb-4">
            {liveOnly ? 'Ao vivo agora' : label ? (
              <>{tag ? <><span className="hash">#</span>{tag}</> : label}</>
            ) : 'Todas as lives'}
            {res.data && <span className="text-base font-sans font-medium text-mist-400 ml-2">{liveNow.length} ao vivo{!liveOnly && upcoming.length ? `, ${upcoming.length} ${upcoming.length === 1 ? 'agendada' : 'agendadas'}` : ''}</span>}
          </h1>

          {res.loading && <Spinner label="Procurando lives" />}
          {res.error && <ErrorBox message={res.error} />}

          {res.data && (
            <>
              {liveNow.length > 0 && <CardGrid>{liveNow.map((l) => <LiveCard key={l.live_id} live={l} highlight={tag} />)}</CardGrid>}

              {liveNow.length === 0 && (
                <Empty title={label ? `Ninguém vendendo ${tag ? '#' + tag : label} ao vivo agora` : 'Nenhuma live com esses filtros agora'}>
                  {upcoming.length || res.data.stores.length
                    ? 'Veja abaixo as próximas lives e as lojas que vendem esse produto.'
                    : 'Tente outra palavra ou remova alguns filtros.'}
                </Empty>
              )}

              {!liveOnly && upcoming.length > 0 && (
                <section className="mt-10">
                  <h2 className="text-xl font-bold mb-3">Próximas lives</h2>
                  <CardGrid>{upcoming.map((l) => <LiveCard key={l.live_id} live={l} />)}</CardGrid>
                </section>
              )}

              {res.data.stores.length > 0 && (
                <section className="mt-10">
                  <h2 className="text-xl font-bold mb-3">Lojas que vendem {label || 'isso'}</h2>
                  <div className="grid md:grid-cols-2 gap-3">{res.data.stores.map((s) => <StoreRow key={s.store_id} s={s} />)}</div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Filtros">
        <FilterForm f={draft} set={(p) => setDraft((d) => ({ ...d, ...p }))} cats={cats.data ?? []} />
        <div className="grid grid-cols-2 gap-2 pt-4">
          <button className="btn btn-ghost" onClick={() => { apply({ ...readFilters(new URLSearchParams()), q: filters.q }); setSheet(false) }}>Limpar</button>
          <button className="btn btn-primary" onClick={() => { apply(draft); setSheet(false) }}>Ver resultados</button>
        </div>
      </Sheet>
    </div>
  )
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="h-10 w-10 rounded-full bg-ink-700 inline-flex items-center justify-center" aria-label="Voltar"><ArrowLeft size={18} /></button>
}
