import { Link } from 'react-router-dom'
import { Check, Percent } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { must, useAsync } from '@/lib/useAsync'
import { useAuth } from '@/lib/auth'
import { cnpjActive } from '@/lib/cnpj'
import { type Campaign, campaignRange, campaignWhen, currentCampaigns, inkOn } from '@/lib/campaigns'
import { Empty, ErrorBox, Spinner } from '@/components/ui'

export default function SellerCampaigns() {
  const { store } = useAuth()
  const { data, loading, reload } = useAsync(async () => {
    const [campaigns, joined] = await Promise.all([
      currentCampaigns(20),
      supabase.from('campaign_stores').select('campaign_id').eq('store_id', store!.id).then(must) as Promise<{ campaign_id: string }[]>,
    ])
    return { campaigns, joined: new Set(joined.map((j) => j.campaign_id)) }
  }, [store?.id])

  if (loading || !data || !store) return <Spinner />
  const canJoin = cnpjActive(store) && store.status === 'approved'

  const join = async (c: Campaign) => {
    const { error } = await supabase.from('campaign_stores').insert({ campaign_id: c.id, store_id: store.id })
    if (error) return toast.error('Não foi possível entrar na campanha', { description: error.message })
    toast.success(`Você está na campanha ${c.name}`, { description: 'Agora é só marcar suas lives nela ao preparar a live.' })
    reload()
  }
  const leave = async (c: Campaign) => {
    if (!window.confirm(`Sair da campanha ${c.name}? Suas lives continuam, mas deixam de aparecer na página da campanha.`)) return
    await supabase.from('lives').update({ campaign_id: null }).eq('store_id', store.id).eq('campaign_id', c.id).neq('status', 'ended')
    const { error } = await supabase.from('campaign_stores').delete().eq('campaign_id', c.id).eq('store_id', store.id)
    if (error) return toast.error(error.message)
    reload()
  }

  return (
    <div className="pb-10 space-y-4">
      <p className="text-sm text-mist-400 max-w-2xl">
        Campanhas são datas especiais com página própria, banner na home e hashtag. Entre na campanha e marque suas lives nela para aparecer para quem procura ofertas da data.
      </p>
      {!canJoin && <ErrorBox message="Para entrar em campanhas, sua loja precisa estar aprovada e com CNPJ ativo." />}
      {!data.campaigns.length ? <Empty title="Nenhuma campanha aberta agora">Quando o LIVESHOP abrir uma nova data, ela aparece aqui.</Empty> : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.campaigns.map((c) => {
            const joined = data.joined.has(c.id)
            const ink = inkOn(c.color)
            return (
              <li key={c.id} className="card overflow-hidden">
                <div className="p-4" style={{ background: c.color, color: ink }}>
                  <p className="text-xs font-semibold opacity-80">{c.is_running ? 'No ar' : 'Em breve'} · {campaignWhen(c)}</p>
                  <p className="font-display text-2xl font-extrabold leading-tight">{c.name}</p>
                  <p className="text-sm font-semibold font-display mt-1">#{c.hashtag}</p>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-sm text-mist-300">{campaignRange(c)}{c.stores_count ? ` · ${c.stores_count} lojas participando` : ''}</p>
                  {c.min_discount_percent && <p className="text-sm inline-flex items-center gap-1.5 text-tag"><Percent size={15} /> Regra: produtos da live com pelo menos {c.min_discount_percent}% de desconto</p>}
                  <div className="flex flex-wrap gap-2">
                    {joined ? (
                      <>
                        <span className="btn btn-sm bg-cool/15 text-cool pointer-events-none"><Check size={15} /> Participando</span>
                        <Link to="/vendedor/lives/nova" className="btn btn-sm btn-primary">Marcar uma live</Link>
                        <button onClick={() => leave(c)} className="btn btn-sm btn-ghost">Sair</button>
                      </>
                    ) : (
                      <button onClick={() => join(c)} disabled={!canJoin} className="btn btn-sm btn-tag">Participar da campanha</button>
                    )}
                    <Link to={`/campanha/${c.slug}`} className="btn btn-sm btn-ghost">Ver página</Link>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
