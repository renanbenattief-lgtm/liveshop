import { Link } from 'react-router-dom'
import { CalendarClock, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { must, useAsync } from '@/lib/useAsync'
import { useAuth } from '@/lib/auth'
import { compact, whenLabel } from '@/lib/format'
import type { Live } from '@/lib/types'
import { Empty, OnAir, Spinner } from '@/components/ui'

export default function Lives() {
  const { store } = useAuth()
  const { data, loading } = useAsync(async () =>
    must(await supabase.from('lives').select('*').eq('store_id', store!.id).order('created_at', { ascending: false })) as Live[], [store?.id])
  if (loading) return <Spinner />
  const groups: [string, Live[]][] = [
    ['Ao vivo', data?.filter((l) => l.status === 'live') ?? []],
    ['Agendadas', (data?.filter((l) => l.status === 'scheduled') ?? []).sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))],
    ['Encerradas', data?.filter((l) => l.status === 'ended') ?? []],
  ]
  return (
    <div className="pb-10">
      <div className="flex justify-end mb-4"><Link to="/vendedor/lives/nova" className="btn btn-tag btn-sm"><Plus size={16} /> Nova live</Link></div>
      {!data?.length ? (
        <Empty title="Você ainda não fez nenhuma live" action={<Link to="/vendedor/lives/nova" className="btn btn-primary">Preparar minha primeira live</Link>}>
          Escolha os produtos, dê um título com hashtags e entre ao vivo pelo celular.
        </Empty>
      ) : groups.map(([title, list]) => list.length > 0 && (
        <section key={title} className="mb-6">
          <h2 className="font-bold mb-2">{title}</h2>
          <ul className="card divide-y divide-ink-700">
            {list.map((l) => (
              <li key={l.id}>
                <Link to={`/vendedor/live/${l.id}`} className="flex items-center gap-3 p-3 hover:bg-ink-700/40">
                  <div className="h-16 w-11 rounded-xl overflow-hidden bg-ink-700 shrink-0">{l.cover_url && <img src={l.cover_url} alt="" className="h-full w-full object-cover" />}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{l.title}</p>
                    <p className="text-sm text-mist-400">
                      {l.status === 'live' && <OnAir viewers={l.viewers_count} small />}
                      {l.status === 'scheduled' && <span className="text-tag inline-flex items-center gap-1"><CalendarClock size={14} /> {l.scheduled_at ? whenLabel(l.scheduled_at) : 'sem data'}</span>}
                      {l.status === 'ended' && <>{l.ended_at && new Date(l.ended_at).toLocaleDateString('pt-BR')} · pico de {compact(l.peak_viewers)} espectadores</>}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
