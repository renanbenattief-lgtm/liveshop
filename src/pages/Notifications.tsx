import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Handshake, Megaphone, Radio, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { must, useAsync } from '@/lib/useAsync'
import { useAuth } from '@/lib/auth'
import { useNotifications, type AppNotification } from '@/lib/notifications'
import { Empty, Spinner } from '@/components/ui'

const ICONS = { live_started: Radio, battle_live: Handshake, campaign_started: Megaphone, new_follower: UserPlus }

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m} min`
  if (m < 1440) return `${Math.floor(m / 60)} h`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function Notifications() {
  const { user, loading: authLoading } = useAuth()
  const { markAllRead } = useNotifications()
  const { data, loading } = useAsync(async () => user
    ? must(await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(80)) as AppNotification[]
    : [], [user?.id])

  // abrir a página marca tudo como lido (a lista ainda mostra o que era novo)
  useEffect(() => { if (data?.some((n) => !n.read_at)) markAllRead() }, [data, markAllRead])

  if (authLoading || loading) return <Spinner />
  if (!user) return (
    <Empty title="Avisos das suas lojas" action={<Link to="/entrar?next=/avisos" className="btn btn-primary">Entrar</Link>}>
      Siga lojas e receba um aviso quando elas entrarem ao vivo.
    </Empty>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6">
      <h1 className="text-3xl font-extrabold mb-5">Avisos</h1>
      {!data?.length ? (
        <Empty title="Nenhum aviso ainda" action={<Link to="/ao-vivo" className="btn btn-primary">Ver lives agora</Link>}>
          Quando uma loja que você segue entrar ao vivo, o aviso aparece aqui.
        </Empty>
      ) : (
        <ul className="card divide-y divide-ink-700 overflow-hidden">
          {data.map((n) => {
            const Icon = ICONS[n.type] ?? Bell
            const body = (
              <div className={`flex gap-3 p-3 ${n.read_at ? '' : 'bg-tag/5'}`}>
                <div className="relative h-12 w-12 shrink-0 rounded-2xl overflow-hidden bg-ink-700 flex items-center justify-center">
                  {n.image_url ? <img src={n.image_url} alt="" className="h-full w-full object-cover" /> : <Icon size={20} className="text-tag" />}
                  {n.type === 'live_started' && <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-onair ring-2 ring-ink-800" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`leading-snug ${n.read_at ? '' : 'font-semibold'}`}>{n.title}</p>
                  {n.body && <p className="text-sm text-mist-400 truncate">{n.body}</p>}
                </div>
                <span className="text-xs text-mist-500 shrink-0">{ago(n.created_at)}</span>
              </div>
            )
            return <li key={n.id}>{n.link ? <Link to={n.link} className="block hover:bg-ink-700/40">{body}</Link> : body}</li>
          })}
        </ul>
      )}
    </div>
  )
}

export function BellButton({ className = '' }: { className?: string }) {
  const { unread } = useNotifications()
  return (
    <Link to="/avisos" className={`relative h-10 w-10 rounded-full bg-ink-700 inline-flex items-center justify-center ${className}`} aria-label={unread ? `Avisos (${unread} novos)` : 'Avisos'}>
      <Bell size={18} />
      {unread > 0 && <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 rounded-full bg-onair text-white text-[11px] font-bold inline-flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
    </Link>
  )
}
