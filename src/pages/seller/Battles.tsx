import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { must, useAsync } from '@/lib/useAsync'
import { useAuth } from '@/lib/auth'
import { PRODUCT_SELECT } from '@/lib/api'
import { money, whenLabel } from '@/lib/format'
import type { Product } from '@/lib/types'
import { type Battle, type BattleParticipant, PARTICIPANT_SELECT, getTerms, splitBattle } from '@/lib/battles'
import { Empty, ErrorBox, Field, Price, Spinner, StoreAvatar } from '@/components/ui'
import { BattleBadge, BattleStatusPill, GoalBar, SplitSimulator, SplitTable, TermsBox } from '@/components/battle'

const BackLink = ({ to }: { to: string }) => (
  <Link to={to} className="h-10 w-10 shrink-0 rounded-full bg-ink-700 inline-flex items-center justify-center" aria-label="Voltar"><ArrowLeft size={18} /></Link>
)

/* ------------------------------------------------------------------ */
/* Lista                                                               */
/* ------------------------------------------------------------------ */
export function SellerBattles() {
  const { store } = useAuth()
  const { data, loading } = useAsync(async () => {
    const mine = must(await supabase.from('battle_participants').select('battle_id').eq('store_id', store!.id)) as { battle_id: string }[]
    if (!mine.length) return []
    const battles = must(await supabase.from('battles').select('*').in('id', mine.map((m) => m.battle_id)).order('created_at', { ascending: false })) as Battle[]
    const parts = must(await supabase.from('battle_participants').select(PARTICIPANT_SELECT).in('battle_id', battles.map((b) => b.id))) as BattleParticipant[]
    return battles.map((b) => ({ ...b, parts: parts.filter((p) => p.battle_id === b.id) }))
  }, [store?.id])

  if (loading) return <Spinner />
  const pendingForMe = data?.filter((b) => b.status === 'invited' && b.parts.some((p) => p.store_id === store!.id && !p.terms_accepted_at)) ?? []
  const rest = data?.filter((b) => !pendingForMe.includes(b)) ?? []

  return (
    <div className="pb-10">
      <div className="rounded-[24px] bg-ink-800 border border-ink-700 p-5 mb-5">
        <BattleBadge />
        <p className="font-display text-2xl font-extrabold mt-3 leading-tight">Venda junto com outra loja e dividam o lucro igualmente.</p>
        <p className="text-sm text-mist-400 mt-1">Live dupla com o mesmo produto e o mesmo preço. Cada loja recebe o custo do que enviou e o lucro é dividido meio a meio.</p>
        <Link to="/vendedor/batalhas/nova" className="btn btn-tag mt-4"><Plus size={18} /> Criar batalha</Link>
      </div>

      {pendingForMe.length > 0 && (
        <section className="mb-6">
          <h2 className="font-bold mb-2">Convites para você</h2>
          <ul className="space-y-2">{pendingForMe.map((b) => <BattleRow key={b.id} b={b} myStore={store!.id} highlight />)}</ul>
        </section>
      )}
      {rest.length > 0 ? (
        <section>
          <h2 className="font-bold mb-2">Suas batalhas</h2>
          <ul className="space-y-2">{rest.map((b) => <BattleRow key={b.id} b={b} myStore={store!.id} />)}</ul>
        </section>
      ) : !pendingForMe.length && (
        <Empty title="Nenhuma batalha ainda">Crie uma batalha e convide uma loja que vende o mesmo produto pelo mesmo preço.</Empty>
      )}
    </div>
  )
}

function BattleRow({ b, myStore, highlight }: { b: Battle & { parts: BattleParticipant[] }; myStore: string; highlight?: boolean }) {
  const other = b.parts.find((p) => p.store_id !== myStore)
  return (
    <li>
      <Link to={`/vendedor/batalhas/${b.id}`} className={`card flex items-center gap-3 p-3 hover:border-ink-500 ${highlight ? 'border-tag/60' : ''}`}>
        <div className="h-16 w-12 rounded-xl overflow-hidden bg-ink-700 shrink-0">{b.cover_url && <img src={b.cover_url} alt="" className="h-full w-full object-cover" />}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{b.title}</p>
          <p className="text-sm text-mist-400 truncate">com {other?.stores?.name ?? 'outra loja'} · {money(b.unit_price)}</p>
          <p className="text-xs text-mist-500">{b.scheduled_at ? whenLabel(b.scheduled_at) : ''}</p>
        </div>
        <BattleStatusPill status={b.status} />
      </Link>
    </li>
  )
}

/* ------------------------------------------------------------------ */
/* Nova batalha (passo a passo)                                        */
/* ------------------------------------------------------------------ */
interface Partner { store_id: string; store_name: string; store_slug: string; store_logo: string | null; city: string; state: string; rating: number; product_id: string; product_name: string; price: number; shared_tags: string[]; image: string | null }

export function NewBattle() {
  const { store } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [product, setProduct] = useState<Product | null>(null)
  const [partner, setPartner] = useState<Partner | null>(null)
  const [title, setTitle] = useState('')
  const [cost, setCost] = useState('')
  const [stock, setStock] = useState('')
  const [date, setDate] = useState('')
  const [goal, setGoal] = useState('')
  const [reward, setReward] = useState('Frete grátis para todo mundo')
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)

  const products = useAsync(async () =>
    must(await supabase.from('products').select(PRODUCT_SELECT).eq('store_id', store!.id).eq('active', true).order('name')) as Product[], [store?.id])
  const partners = useAsync(async () => product
    ? must(await supabase.rpc('battle_partner_suggestions', { p_product: product.id })) as Partner[]
    : [], [product?.id])
  const terms = useAsync(() => getTerms(), [])
  const commission = useAsync(async () => (must(await supabase.from('platform_settings').select('commission_percent').single()) as { commission_percent: number }).commission_percent, [])

  useEffect(() => {
    if (product && partner && !title) setTitle(`Batalha do Bem: ${store?.city} x ${partner.city}`)
    if (product && !stock) setStock(String(product.stock))
  }, [product, partner, title, stock, store?.city])

  const price = product ? product.promo_price ?? product.price : 0
  const costNum = Number(cost.replace(',', '.'))
  const approved = store?.status === 'approved'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!product || !partner) return
    if (!accepted) return toast.error('Aceite o termo para enviar o convite')
    setBusy(true)
    const { data, error } = await supabase.rpc('create_battle', {
      p_title: title, p_product: product.id, p_guest_store: partner.store_id, p_unit_cost: costNum,
      p_stock: parseInt(stock) || 0, p_scheduled_at: new Date(date).toISOString(),
      p_goal_units: goal ? parseInt(goal) : null, p_goal_reward: goal ? reward : null,
    })
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success('Convite enviado', { description: `${partner.store_name} precisa aceitar o termo para a batalha ser agendada.` })
    navigate(`/vendedor/batalhas/${data}`)
  }

  const steps = ['Produto', 'Loja parceira', 'Regras', 'Termo']

  return (
    <div className="max-w-2xl pb-12">
      <div className="flex items-center gap-3 mb-4">
        <BackLink to="/vendedor/batalhas" />
        <h1 className="text-2xl font-extrabold">Nova batalha</h1>
      </div>
      <ol className="flex gap-1.5 mb-6" aria-label="Etapas">
        {steps.map((s, i) => (
          <li key={s} className="flex-1">
            <span className={`block h-1.5 rounded-full ${i < step ? 'bg-tag' : 'bg-ink-600'}`} />
            <span className={`block text-[11px] mt-1 ${i + 1 === step ? 'text-mist font-semibold' : 'text-mist-500'}`}>{s}</span>
          </li>
        ))}
      </ol>

      {!approved && <div className="mb-4"><ErrorBox message="Sua loja precisa ser aprovada antes de criar batalhas." /></div>}

      {step === 1 && (
        <section>
          <h2 className="font-bold mb-1">Qual produto vai para a batalha?</h2>
          <p className="text-sm text-mist-400 mb-3">A loja parceira precisa vender o mesmo produto pelo mesmo preço.</p>
          {products.loading ? <Spinner /> : !products.data?.length ? (
            <Empty title="Cadastre um produto primeiro" action={<Link to="/vendedor/produtos/novo" className="btn btn-primary">Novo produto</Link>} />
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {products.data.map((p) => {
                const img = [...(p.product_images ?? [])].sort((a, b) => a.position - b.position)[0]?.url
                return (
                  <li key={p.id} className="min-w-0">
                    <button type="button" onClick={() => { setProduct(p); setPartner(null); setTitle(''); setStock(''); setStep(2) }}
                      className="w-full text-left flex items-center gap-3 p-2 rounded-2xl border border-ink-600 bg-ink-800 hover:border-tag">
                      <div className="h-14 w-14 rounded-xl overflow-hidden bg-ink-700 shrink-0">{img && <img src={img} alt="" className="h-full w-full object-cover" />}</div>
                      <div className="min-w-0 flex-1"><p className="text-sm truncate">{p.name}</p><Price price={p.price} promo={p.promo_price} size="sm" /></div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {step === 2 && product && (
        <section>
          <h2 className="font-bold mb-1">Escolha a loja parceira</h2>
          <p className="text-sm text-mist-400 mb-3">Lojas que vendem algo parecido com <strong className="text-mist">{product.name}</strong> por <strong className="text-tag">{money(price)}</strong>.</p>
          {partners.loading ? <Spinner label="Procurando lojas" /> : partners.error ? <ErrorBox message={partners.error} /> : !partners.data?.length ? (
            <Empty title="Nenhuma loja com o mesmo produto e preço agora">
              Quando outras lojas cadastrarem esse produto pelo mesmo preço, elas aparecem aqui. Use hashtags parecidas para facilitar.
            </Empty>
          ) : (
            <ul className="space-y-2">
              {partners.data.map((pt) => (
                <li key={pt.store_id + pt.product_id}>
                  <button type="button" onClick={() => { setPartner(pt); setStep(3) }}
                    className="w-full text-left card flex items-center gap-3 p-3 hover:border-tag">
                    <div className="h-14 w-14 rounded-xl overflow-hidden bg-ink-700 shrink-0">{pt.image && <img src={pt.image} alt="" className="h-full w-full object-cover" />}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate flex items-center gap-2"><StoreAvatar name={pt.store_name} url={pt.store_logo} size={20} />{pt.store_name}</p>
                      <p className="text-sm text-mist-400 truncate">{pt.product_name}</p>
                      <p className="text-xs text-mist-500">{pt.city}/{pt.state}{pt.shared_tags.length ? ` · ${pt.shared_tags.map((t) => '#' + t).join(' ')}` : ''}</p>
                    </div>
                    <span className="text-tag font-semibold text-sm">{money(pt.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => setStep(1)} className="btn btn-ghost btn-sm mt-4">Trocar produto</button>
        </section>
      )}

      {step === 3 && product && partner && (
        <form onSubmit={(e) => { e.preventDefault(); if (!(costNum >= 0 && costNum <= price)) return toast.error('Informe um custo entre R$ 0 e o preço de venda'); if (!date) return toast.error('Escolha a data e o horário'); setStep(4) }} className="space-y-5">
          <div className="card p-3 flex items-center gap-3">
            <StoreAvatar name={store!.name} url={store!.logo_url} size={36} />
            <span className="font-display font-extrabold text-tag">+</span>
            <StoreAvatar name={partner.store_name} url={partner.store_logo} size={36} />
            <p className="text-sm min-w-0 flex-1 truncate"><strong>{store!.name}</strong> e <strong>{partner.store_name}</strong> vendendo por {money(price)}</p>
          </div>
          <Field label="Título da batalha"><input className="input" required maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Custo (R$)" hint="Igual nas duas lojas"><input className="input" required inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="70,00" /></Field>
            <Field label="Seu estoque"><input className="input" required inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} /></Field>
          </div>
          <Field label="Data e horário"><input type="datetime-local" className="input" required value={date} min={new Date().toISOString().slice(0, 16)} onChange={(e) => setDate(e.target.value)} /></Field>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <Field label="Meta (unid.)" hint="Opcional"><input className="input" inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="60" /></Field>
            <Field label="Prêmio ao bater a meta"><input className="input" value={reward} onChange={(e) => setReward(e.target.value)} disabled={!goal} /></Field>
          </div>
          {costNum > 0 && costNum <= price && (
            <details className="card p-4" open>
              <summary className="font-semibold cursor-pointer">Simule a divisão</summary>
              <p className="text-sm text-mist-400 mt-1 mb-3">Mude as vendas de cada loja: o lucro final sai sempre igual.</p>
              <SplitSimulator price={price} cost={costNum} commission={commission.data ?? 10} names={[store!.name, partner.store_name]} />
            </details>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(2)} className="btn btn-ghost">Voltar</button>
            <button className="btn btn-primary flex-1 sm:flex-none">Continuar</button>
          </div>
        </form>
      )}

      {step === 4 && product && partner && (
        <form onSubmit={submit} className="space-y-5">
          <dl className="card p-4 grid grid-cols-2 gap-y-1.5 text-sm">
            <dt className="text-mist-400">Lojas</dt><dd className="text-right truncate">{store!.name} + {partner.store_name}</dd>
            <dt className="text-mist-400">Preço de venda</dt><dd className="text-right">{money(price)}</dd>
            <dt className="text-mist-400">Custo unitário</dt><dd className="text-right">{money(costNum)}</dd>
            <dt className="text-mist-400">Comissão LIVESHOP</dt><dd className="text-right">{String(commission.data ?? 10).replace('.', ',')}%</dd>
            <dt className="text-mist-400">Quando</dt><dd className="text-right">{date && whenLabel(new Date(date).toISOString())}</dd>
            {goal && <><dt className="text-mist-400">Meta</dt><dd className="text-right">{goal} unid. · {reward}</dd></>}
          </dl>
          {terms.data ? <TermsBox body={terms.data.body} accepted={accepted} onChange={setAccepted} /> : <Spinner />}
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(3)} className="btn btn-ghost">Voltar</button>
            <button disabled={busy || !accepted || !approved} className="btn btn-primary flex-1 sm:flex-none">{busy ? 'Enviando…' : 'Aceitar e enviar convite'}</button>
          </div>
        </form>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Detalhe da batalha (convite, aceite, extrato)                       */
/* ------------------------------------------------------------------ */
export function SellerBattleDetail() {
  const { id } = useParams()
  const { store } = useAuth()
  const navigate = useNavigate()
  const { data, loading, reload } = useAsync(async () => {
    const battle = must(await supabase.from('battles').select('*').eq('id', id!).single()) as Battle
    const parts = must(await supabase.from('battle_participants').select(PARTICIPANT_SELECT).eq('battle_id', id!)) as BattleParticipant[]
    parts.sort((a, b) => (a.role === 'host' ? -1 : 1) - (b.role === 'host' ? -1 : 1))
    const terms = await getTerms(battle.terms_version)
    return { battle, parts, terms }
  }, [id])

  const me = data?.parts.find((p) => p.store_id === store?.id)
  const mustAccept = data?.battle.status === 'invited' && me && !me.terms_accepted_at

  // aceite do convite
  const myProducts = useAsync(async () => mustAccept
    ? must(await supabase.from('products').select(PRODUCT_SELECT).eq('store_id', store!.id).eq('active', true)) as Product[]
    : [], [mustAccept, store?.id])
  const matching = useMemo(() => (myProducts.data ?? []).filter((p) => (p.promo_price ?? p.price) === Number(data?.battle.unit_price)), [myProducts.data, data?.battle.unit_price])
  const [productId, setProductId] = useState('')
  const [stock, setStock] = useState('')
  const [cost, setCost] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)

  if (loading || !data) return <Spinner />
  const { battle, parts, terms } = data
  const names = parts.map((p) => p.stores?.name ?? 'Loja')
  const totalUnits = parts.reduce((a, p) => a + p.units_sold, 0)
  const statement = splitBattle(Number(battle.unit_price), Number(battle.unit_cost), Number(battle.commission_percent),
    parts.map((p) => p.units_sold), parts.map((p) => Number(p.shipping_paid)), parts.map((p) => Number(p.refunded_amount)))

  const accept = async (e: FormEvent) => {
    e.preventDefault()
    if (!accepted) return toast.error('Aceite o termo para entrar na batalha')
    setBusy(true)
    const { error } = await supabase.rpc('accept_battle', { p_battle: battle.id, p_product: productId, p_stock: parseInt(stock) || 0, p_declared_cost: Number(cost.replace(',', '.')) })
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success('Você está na batalha', { description: 'A batalha foi agendada.' })
    reload()
  }
  const decline = async () => {
    if (!window.confirm(battle.host_store_id === store?.id ? 'Cancelar esta batalha?' : 'Recusar o convite?')) return
    const { error } = await supabase.rpc('decline_battle', { p_battle: battle.id })
    if (error) return toast.error(error.message)
    navigate('/vendedor/batalhas')
  }
  const setStatus = async (s: 'live' | 'ended') => {
    const { error } = await supabase.rpc('set_battle_status', { p_battle: battle.id, p_status: s })
    if (error) return toast.error(error.message)
    toast.success(s === 'live' ? 'Batalha ao vivo' : 'Batalha encerrada')
    reload()
  }

  return (
    <div className="max-w-2xl pb-12 space-y-5">
      <div className="flex items-start gap-3">
        <BackLink to="/vendedor/batalhas" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold leading-tight">{battle.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <BattleStatusPill status={battle.status} />
            <span className="text-sm text-mist-400">{battle.scheduled_at && whenLabel(battle.scheduled_at)}</span>
          </div>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-2">
        {parts.map((p, i) => (
          <li key={p.store_id} className={`card p-3 border-t-4 ${i === 0 ? 'border-t-tag' : 'border-t-cool'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <StoreAvatar name={p.stores?.name ?? '?'} url={p.stores?.logo_url} size={28} />
              <span className="font-semibold text-sm truncate">{p.stores?.name}</span>
            </div>
            <p className="text-xs text-mist-400 mt-2 truncate">{p.products?.name ?? 'Produto a escolher'}</p>
            <p className="text-xs mt-1">{p.terms_accepted_at
              ? <span className="text-cool inline-flex items-center gap-1"><Check size={13} /> Termo aceito</span>
              : <span className="text-tag">Aguardando aceite</span>}</p>
            {p.stock_declared != null && <p className="text-xs text-mist-500">Estoque: {p.stock_declared}</p>}
          </li>
        ))}
      </ul>

      <dl className="card p-4 grid grid-cols-2 gap-y-1.5 text-sm">
        <dt className="text-mist-400">Preço de venda</dt><dd className="text-right">{money(battle.unit_price)}</dd>
        <dt className="text-mist-400">Custo unitário</dt><dd className="text-right">{money(battle.unit_cost)}</dd>
        <dt className="text-mist-400">Comissão LIVESHOP</dt><dd className="text-right">{String(battle.commission_percent).replace('.', ',')}%</dd>
      </dl>

      {battle.goal_units && <div className="card p-4"><GoalBar units={totalUnits} goal={battle.goal_units} reward={battle.goal_reward} split={parts.map((p) => p.units_sold)} /></div>}

      {mustAccept && (
        <form onSubmit={accept} className="card p-4 space-y-4 border-tag/60">
          <h2 className="font-bold">Você foi convidado para esta batalha</h2>
          {myProducts.loading ? <Spinner /> : !matching.length ? (
            <ErrorBox message={`Você precisa ter um produto ativo por ${money(battle.unit_price)} para entrar. Ajuste o preço de um produto e volte aqui.`} />
          ) : (
            <>
              <Field label="Seu produto na batalha">
                <select className="input px-3" required value={productId} onChange={(e) => { setProductId(e.target.value); const p = matching.find((x) => x.id === e.target.value); if (p && !stock) setStock(String(p.stock)) }}>
                  <option value="" disabled>Escolha</option>
                  {matching.map((p) => <option key={p.id} value={p.id}>{p.name} · {money(p.promo_price ?? p.price)}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Custo (R$)" hint={`Precisa ser ${money(battle.unit_cost)}`}><input className="input" required inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
                <Field label="Seu estoque"><input className="input" required inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} /></Field>
              </div>
              <TermsBox body={terms.body} accepted={accepted} onChange={setAccepted} />
              <div className="flex flex-wrap gap-2">
                <button disabled={busy || !accepted} className="btn btn-primary">{busy ? 'Enviando…' : 'Aceitar e entrar na batalha'}</button>
                <button type="button" onClick={decline} className="btn btn-outline">Recusar</button>
              </div>
            </>
          )}
        </form>
      )}

      {(battle.status === 'scheduled' || battle.status === 'live') && (
        <div className="flex flex-wrap gap-2">
          {battle.status === 'scheduled' && <button onClick={() => setStatus('live')} className="btn btn-primary">Começar batalha ao vivo</button>}
          {battle.status === 'live' && <button onClick={() => setStatus('ended')} className="btn btn-primary">Encerrar batalha</button>}
          <Link to={`/batalha/${battle.id}`} className="btn btn-ghost">Ver como comprador</Link>
        </div>
      )}
      {battle.status !== 'live' && battle.status !== 'ended' && battle.status !== 'declined' && battle.status !== 'cancelled' && !mustAccept && (
        <button onClick={decline} className="text-sm text-mist-400 hover:text-onair py-2">{battle.host_store_id === store?.id ? 'Cancelar batalha' : 'Sair da batalha'}</button>
      )}

      <section className="card p-4">
        <h2 className="font-bold mb-1">{battle.status === 'ended' ? 'Extrato da batalha' : 'Extrato até agora'}</h2>
        <p className="text-sm text-mist-400 mb-3">As vendas entram aqui automaticamente quando o pagamento estiver ativo.</p>
        <SplitTable names={names} r={statement} />
      </section>

      {battle.status !== 'ended' && (
        <details className="card p-4">
          <summary className="font-semibold cursor-pointer">Simular a divisão</summary>
          <div className="mt-3"><SplitSimulator price={Number(battle.unit_price)} cost={Number(battle.unit_cost)} commission={Number(battle.commission_percent)} names={names} /></div>
        </details>
      )}

      <details className="card p-4">
        <summary className="font-semibold cursor-pointer">Termo aceito (versão {terms.version})</summary>
        <div className="mt-3 text-sm text-mist-300 whitespace-pre-line leading-relaxed">{terms.body}</div>
      </details>
    </div>
  )
}
