import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { ErrorBox, Field, Logo } from '@/components/ui'

export default function Login() {
  const [sp] = useSearchParams()
  const next = sp.get('next') || '/'
  const navigate = useNavigate()
  const { user } = useAuth()
  const [mode, setMode] = useState<'in' | 'up'>(sp.get('modo') === 'cadastro' ? 'up' : 'in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (user) return <Navigate to={next} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setErr(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
      else navigate(next, { replace: true })
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name }, emailRedirectTo: window.location.origin + next },
      })
      if (error) setErr(error.message)
      else if (!data.session) { toast.success('Conta criada', { description: 'Confirme pelo link que enviamos para o seu e-mail.' }); setMode('in') }
      else navigate(next, { replace: true })
    }
    setBusy(false)
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-block mb-8"><Logo size="lg" /></Link>
        <h1 className="text-3xl font-extrabold mb-1">{mode === 'in' ? 'Entrar' : 'Criar conta'}</h1>
        <p className="text-mist-400 mb-6">{mode === 'in' ? 'Acompanhe suas lojas e compre ao vivo.' : 'Leva menos de um minuto.'}</p>
        <form onSubmit={submit} className="space-y-4">
          {mode === 'up' && <Field label="Nome"><input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" /></Field>}
          <Field label="E-mail"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></Field>
          <Field label="Senha" hint={mode === 'up' ? 'Mínimo de 6 caracteres' : undefined}>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
          </Field>
          {err && <ErrorBox message={err} />}
          <button disabled={busy} className="btn btn-primary w-full">{busy ? 'Aguarde…' : mode === 'in' ? 'Entrar' : 'Criar conta'}</button>
        </form>
        <p className="text-center text-sm text-mist-400 mt-6">
          {mode === 'in' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
          <button onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr(null) }} className="text-tag font-semibold">{mode === 'in' ? 'Criar conta' : 'Entrar'}</button>
        </p>
      </div>
    </div>
  )
}
