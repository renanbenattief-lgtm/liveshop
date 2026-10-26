import { NavLink, Outlet, Link } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import { cnpjActive, formatCnpj, verifyStoreCnpj } from '@/lib/cnpj'
import { Clock, ExternalLink, Radio, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { StoreAvatar } from '@/components/ui'

const tabs = [
  { to: '/vendedor', label: 'Painel', end: true },
  { to: '/vendedor/produtos', label: 'Produtos' },
  { to: '/vendedor/lives', label: 'Lives' },
  { to: '/vendedor/batalhas', label: 'Batalhas' },
  { to: '/vendedor/campanhas', label: 'Campanhas' },
  { to: '/vendedor/frete', label: 'Frete' },
  { to: '/vendedor/loja', label: 'Loja' },
]

export default function SellerLayout() {
  const { store, refresh } = useAuth()
  const [checking, setChecking] = useState(false)
  if (!store) return null
  const recheck = async () => {
    setChecking(true)
    const r = await verifyStoreCnpj()
    setChecking(false)
    if (r.ok) toast.success('CNPJ ativo confirmado na Receita')
    else toast.error(r.unavailable ? 'A Receita não respondeu agora' : 'CNPJ ainda não está ativo', { description: r.error ?? `Situação: ${r.status}` })
    refresh()
  }
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 pt-5 md:pt-8">
      <div className="flex items-center gap-3 mb-4">
        <StoreAvatar name={store.name} url={store.logo_url} size={44} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-mist-400">Painel do vendedor</p>
          <p className="font-display text-xl font-bold truncate">{store.name}</p>
        </div>
        {store.status === 'approved' && <Link to={`/loja/${store.slug}`} className="btn btn-ghost btn-sm hidden sm:inline-flex"><ExternalLink size={15} /> Ver loja</Link>}
        <Link to="/vendedor/lives/nova" className="btn btn-primary btn-sm"><Radio size={15} /> Iniciar live</Link>
      </div>

      {!cnpjActive(store) && (
        <div className="rounded-2xl bg-onair/15 border border-onair/40 px-4 py-3 mb-4 text-sm">
          <p className="flex gap-3"><ShieldAlert size={18} className="text-onair shrink-0 mt-0.5" />
            <span><strong>Seu CNPJ precisa estar ATIVO na Receita Federal para vender.</strong>{' '}
              {store.cnpj_status ? `Situação na última consulta: ${store.cnpj_status}.` : 'Ainda não conseguimos consultar o seu CNPJ.'}
              {store.document && <> CNPJ {formatCnpj(store.document)}.</>}</span></p>
          <div className="flex flex-wrap gap-2 mt-2 pl-7">
            <button onClick={recheck} disabled={checking} className="btn btn-sm bg-onair text-white">{checking ? 'Consultando…' : 'Verificar CNPJ'}</button>
            <Link to="/vendedor/loja" className="btn btn-sm btn-ghost">Corrigir CNPJ</Link>
          </div>
        </div>
      )}
      {store.status === 'pending' && (
        <div className="rounded-2xl bg-tag/15 border border-tag/40 px-4 py-3 mb-4 flex gap-3 text-sm">
          <Clock size={18} className="text-tag shrink-0 mt-0.5" />
          <p><strong>Loja em análise.</strong> Você já pode cadastrar produtos e agendar lives. Assim que aprovarmos, sua loja aparece na busca e você pode entrar ao vivo.</p>
        </div>
      )}
      {(store.status === 'suspended' || store.status === 'rejected') && (
        <div className="rounded-2xl bg-onair/15 border border-onair/40 px-4 py-3 mb-4 flex gap-3 text-sm">
          <ShieldAlert size={18} className="text-onair shrink-0 mt-0.5" />
          <p><strong>{store.status === 'suspended' ? 'Loja suspensa.' : 'Loja não aprovada.'}</strong> {store.status_reason || 'Fale com o suporte do LIVESHOP para entender o motivo.'}</p>
        </div>
      )}

      <nav className="flex gap-1 overflow-x-auto no-scrollbar border-b border-ink-700 mb-6 -mx-4 px-4 md:mx-0 md:px-0">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}
            className={({ isActive }) => `px-4 h-11 inline-flex items-center text-sm font-semibold border-b-2 -mb-px whitespace-nowrap ${isActive ? 'border-tag text-mist' : 'border-transparent text-mist-400 hover:text-mist'}`}>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
