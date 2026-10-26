import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/lib/auth'
import { Spinner } from './ui'

export function RequireAuth({ children, admin, seller }: { children: ReactNode; admin?: boolean; seller?: boolean }) {
  const { user, loading, isAdmin, store } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner />
  if (!user) return <Navigate to={`/entrar?next=${encodeURIComponent(location.pathname)}`} replace />
  if (admin && !isAdmin) return <Navigate to="/" replace />
  if (seller && !store) return <Navigate to="/vender" replace />
  return <>{children}</>
}
