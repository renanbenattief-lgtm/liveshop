import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { UFS } from '@/lib/format'
import { Field, Toggle } from '@/components/ui'

export default function Shipping() {
  const { store, refresh } = useAuth()
  const [free, setFree] = useState(false)
  const [freeMin, setFreeMin] = useState('')
  const [days, setDays] = useState('3')
  const [fast, setFast] = useState(false)
  const [regions, setRegions] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!store) return
    setFree(store.free_shipping_min != null)
    setFreeMin(store.free_shipping_min != null ? String(store.free_shipping_min) : '')
    setDays(String(store.shipping_days)); setFast(store.fast_delivery); setRegions(store.regions ?? [])
  }, [store])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!store) return
    setBusy(true)
    const { error } = await supabase.from('stores').update({
      free_shipping_min: free ? Number(freeMin.replace(',', '.') || 0) : null,
      shipping_days: parseInt(days) || 0, fast_delivery: fast, regions,
    }).eq('id', store.id)
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success('Regras de frete salvas'); refresh()
  }

  return (
    <form onSubmit={save} className="max-w-xl space-y-2 pb-12">
      <p className="text-sm text-mist-400 mb-4">Essas regras aparecem nos filtros de busca. Quem filtra por frete grátis ou entrega rápida só vê lojas que oferecem isso.</p>
      <div className="card px-4 divide-y divide-ink-700">
        <Toggle label="Oferecer frete grátis" checked={free} onChange={setFree} />
        {free && (
          <div className="py-3">
            <Field label="Frete grátis para compras acima de (R$)" hint="Deixe 0 para frete grátis em qualquer compra">
              <input className="input" inputMode="decimal" value={freeMin} onChange={(e) => setFreeMin(e.target.value)} placeholder="0" />
            </Field>
          </div>
        )}
        <Toggle label="Entrega rápida" hint="Você posta o pedido em até 48 horas" checked={fast} onChange={setFast} />
        <div className="py-3">
          <Field label="Prazo para postar o pedido (dias úteis)">
            <input className="input" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />
          </Field>
        </div>
        <div className="py-3">
          <p className="field-label">Estados atendidos</p>
          <p className="text-xs text-mist-500 mb-2">Nenhum marcado = envia para todo o Brasil.</p>
          <div className="flex flex-wrap gap-1.5">
            {UFS.map((u) => (
              <button type="button" key={u} onClick={() => setRegions((r) => (r.includes(u) ? r.filter((x) => x !== u) : [...r, u]))}
                className={`chip h-8 px-3 ${regions.includes(u) ? 'chip-on' : ''}`}>{u}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="pt-4"><button disabled={busy} className="btn btn-primary">{busy ? 'Salvando…' : 'Salvar frete'}</button></div>
    </form>
  )
}
