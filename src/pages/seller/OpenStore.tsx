import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Radio, Search, ShoppingBag } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Spinner } from '@/components/ui'
import { StoreForm } from './StoreForm'

const steps = [
  { icon: ShoppingBag, title: 'Cadastre seus produtos', text: 'Com fotos, preço, estoque e as hashtags que o comprador usa para buscar.' },
  { icon: Radio, title: 'Entre ao vivo pelo celular', text: 'Escolha os produtos da live e fixe o que está mostrando. O visual padrão deixa tudo com cara profissional.' },
  { icon: Search, title: 'Receba quem já quer comprar', text: 'Quem busca #blusadefrio cai direto na sua live, filtrando por frete e localização.' },
]

export default function OpenStore() {
  const { user, store, loading } = useAuth()
  const navigate = useNavigate()
  if (loading) return <Spinner />
  if (store) return <Navigate to="/vendedor" replace />

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-12 md:grid md:grid-cols-[1fr_440px] md:gap-12">
      <div>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-[1.02]">Abra sua loja e venda ao vivo.</h1>
        <p className="text-mist-300 mt-3 max-w-md">No LIVESHOP toda venda acontece em live. O comprador chega pela busca, já sabendo o que quer.</p>
        <ol className="mt-8 space-y-5">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="h-11 w-11 shrink-0 rounded-2xl bg-ink-700 text-tag inline-flex items-center justify-center font-display font-extrabold">{i + 1}</span>
              <div>
                <p className="font-semibold flex items-center gap-2"><s.icon size={16} className="text-mist-400" /> {s.title}</p>
                <p className="text-sm text-mist-400 mt-0.5">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-sm text-mist-500 mt-8 mb-8">A plataforma fica com uma comissão sobre cada venda. Sem mensalidade para começar.</p>
      </div>

      <div className="card p-5 md:p-6 mb-10 self-start">
        {user ? (
          <>
            <h2 className="text-xl font-bold mb-1">Dados da loja</h2>
            <p className="text-sm text-mist-400 mb-5">Sua loja passa por uma aprovação rápida antes de poder entrar ao vivo.</p>
            <StoreForm onSaved={() => navigate('/vendedor')} />
          </>
        ) : (
          <div className="text-center py-6">
            <h2 className="text-xl font-bold mb-2">Primeiro, entre na sua conta</h2>
            <p className="text-sm text-mist-400 mb-5">A loja fica ligada à sua conta do LIVESHOP.</p>
            <div className="flex gap-2 justify-center">
              <Link to="/entrar?modo=cadastro&next=/vender" className="btn btn-primary">Criar conta</Link>
              <Link to="/entrar?next=/vender" className="btn btn-ghost">Entrar</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
