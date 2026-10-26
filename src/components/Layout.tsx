import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Heart, Home, Radio, Search, Store, User } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Logo } from './ui'
import { useAuth } from '@/lib/auth'
import { supabaseConfigured } from '@/lib/supabase'

const nav = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/buscar', label: 'Buscar', icon: Search },
  { to: '/ao-vivo', label: 'Ao vivo', icon: Radio },
  { to: '/seguindo', label: 'Seguindo', icon: Heart },
  { to: '/conta', label: 'Perfil', icon: User },
]

function DesktopSearch() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const submit = (e: FormEvent) => { e.preventDefault(); navigate(`/buscar?q=${encodeURIComponent(q)}`) }
  return (
    <form onSubmit={submit} className="flex-1 max-w-xl relative">
      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mist-500" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="O que você quer comprar? Ex: #blusadefrio"
        className="input h-11 pl-11 rounded-full" aria-label="Buscar" />
    </form>
  )
}

export default function Layout() {
  const { store, isAdmin } = useAuth()
  const { pathname } = useLocation()
  const immersive = pathname.startsWith('/live/')

  return (
    <div className="min-h-screen">
      {!supabaseConfigured && (
        <div className="bg-tag text-ink text-sm font-medium px-4 py-2 text-center">
          Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env para carregar os dados.
        </div>
      )}
      {!immersive && (
        <header className="hidden md:block sticky top-0 z-30 bg-ink/90 backdrop-blur border-b border-ink-700">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-6">
            <Link to="/" aria-label="LIVESHOP início"><Logo /></Link>
            <DesktopSearch />
            <nav className="flex items-center gap-1 text-sm font-medium">
              {nav.slice(2).map((n) => (
                <NavLink key={n.to} to={n.to} className={({ isActive }) => `px-3 h-10 rounded-full inline-flex items-center gap-2 ${isActive ? 'bg-ink-700 text-mist' : 'text-mist-300 hover:text-mist'}`}>
                  <n.icon size={17} /> {n.label}
                </NavLink>
              ))}
              {isAdmin && <NavLink to="/admin" className="px-3 h-10 rounded-full inline-flex items-center text-mist-300 hover:text-mist">Admin</NavLink>}
              <Link to={store ? '/vendedor' : '/vender'} className="btn btn-tag btn-sm ml-2"><Store size={16} /> {store ? 'Minha loja' : 'Vender ao vivo'}</Link>
            </nav>
          </div>
        </header>
      )}

      <main className={immersive ? '' : 'pb-24 md:pb-10'}>
        <Outlet />
      </main>

      {!immersive && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-ink-900/95 backdrop-blur border-t border-ink-700 safe-b" aria-label="Navegação principal">
          <ul className="grid grid-cols-5">
            {nav.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.end} className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 h-16 text-[11px] font-medium ${isActive ? 'text-mist' : 'text-mist-500'}`}>
                  {({ isActive }) => (
                    <>
                      {n.to === '/ao-vivo'
                        ? <span className={`h-9 w-12 rounded-2xl inline-flex items-center justify-center ${isActive ? 'bg-onair text-white' : 'bg-ink-700 text-mist'}`}><n.icon size={20} /></span>
                        : <n.icon size={22} strokeWidth={isActive ? 2.4 : 1.8} />}
                      {n.to !== '/ao-vivo' && n.label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
