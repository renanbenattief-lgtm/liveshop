import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import { StoreForm } from './StoreForm'

export default function StoreSettings() {
  const { store } = useAuth()
  return (
    <div className="max-w-xl pb-12">
      <StoreForm store={store} onSaved={() => toast.success('Dados da loja salvos')} />
    </div>
  )
}
