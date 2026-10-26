import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { must, useAsync } from '@/lib/useAsync'
import { useAuth } from '@/lib/auth'
import { whenLabel } from '@/lib/format'
import type { Live, Store } from '@/lib/types'
import { Empty, OnAir, Rating, Spinner, StoreAvatar } from '@/components/ui'
import { BellButton } from '@/pages/Notifications'

export default function Following() {
  const { user, loading: authLoading } = useAuth()
  const { data, loading } = useAsync(async () => {
    if (!user) return null
    const rows = must(await supabase.from('store_followers').select('stores(*)').eq('user_id', user.id).order('created_at', { ascending: false })) as unknown as { stores: Store | null }[]
    const stores = rows.map((r) => r.stores).filter((s): s is Store => !!s)
    const lives = stores.length
      ? must(await supabase.from('lives').select('*').in('store_id', stores.map((s) => s.id)).in('status', ['live', 'scheduled'])) as Live[]
      : []
    return { stores, lives }
  }, [user?.id])

  if (authLoading || loading) return <Spinner />
  if (!user) return (
    <Empty title="Siga suas lojas favoritas" action={<Link to="/entrar?next=/seguindo" className="btn btn-primary">Entrar</Link>}>
      Entre na sua conta para ver quem está ao vivo entre as lojas que você segue.
    </Empty>
  )
  const live = (id: string) => data?.lives.find((l) => l.store_id === id && l.status === 'live')
  const next = (id: string) => data?.lives.filter((l) => l.store_id === id && l.status === 'scheduled' && l.scheduled_at && new Date(l.scheduled_at) > new Date())
    .sort((a, b) => a.scheduled_at!.localeCompare(b.scheduled_at!))[0]
  const stores = [...(data?.stores ?? [])].sort((a, b) => Number(!!live(b.id)) - Number(!!live(a.id)))

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 pt-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-3xl font-extrabold">Seguindo</h1>
        <BellButton />
      </div>
      <p className="text-sm text-mist-400 -mt-3 mb-4">Você recebe um aviso quando estas lojas entram ao vivo.</p>
      {!stores.length ? (
        <Empty title="Você ainda não segue nenhuma loja" action={<Link to="/ao-vivo" className="btn btn-primary">Ver lives agora</Link>}>
          Toque em Seguir numa live ou na página da loja para acompanhar por aqui.
        </Empty>
      ) : (
        <ul className="space-y-2">
          {stores.map((s) => {
            const l = live(s.id); const n = next(s.id)
            return (
              <li key={s.id}>
                <Link to={l ? `/live/${l.id}` : `/loja/${s.slug}`} className="card flex items-center gap-3 p-3 hover:border-ink-500">
                  <StoreAvatar name={s.name} url={s.logo_url} size={52} ring={!!l} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{s.name}</p>
                    {l ? <p className="text-sm text-mist-300 truncate">{l.title}</p>
                      : n ? <p className="text-sm text-tag">Próxima live {whenLabel(n.scheduled_at)}</p>
                      : <Rating value={s.rating} count={s.rating_count} />}
                  </div>
                  {l && <OnAir viewers={l.viewers_count} small />}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
