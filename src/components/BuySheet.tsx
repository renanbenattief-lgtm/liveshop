import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { Product } from '@/lib/types'
import { Price, Sheet } from './ui'

/** Gaveta de compra: escolher variação e quantidade. O checkout real chega na fase 3. */
export function BuySheet({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const [variant, setVariant] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  useEffect(() => { setVariant(null); setQty(1) }, [product?.id])

  const groups = useMemo(() => {
    const g = new Map<string, Product['product_variants']>()
    for (const v of product?.product_variants ?? []) g.set(v.name, [...(g.get(v.name) ?? []), v])
    return [...g.entries()]
  }, [product])

  if (!product) return null
  const img = [...(product.product_images ?? [])].sort((a, b) => a.position - b.position)[0]?.url
  const needsVariant = groups.length > 0 && !variant

  return (
    <Sheet open={!!product} onClose={onClose} title="Comprar">
      <div className="flex gap-3">
        {img && <img src={img} alt="" className="h-24 w-24 rounded-2xl object-cover" />}
        <div className="min-w-0">
          <p className="font-semibold leading-snug">{product.name}</p>
          <Price price={product.price} promo={product.promo_price} />
          <p className="text-xs text-mist-400 mt-1">{product.stock > 0 ? `${product.stock} em estoque` : 'Esgotado'}</p>
          <Link to={`/produto/${product.id}`} className="inline-block py-2 text-sm text-tag underline underline-offset-2">Ver detalhes</Link>
        </div>
      </div>

      {groups.map(([name, vs]) => (
        <div key={name} className="mt-5">
          <p className="field-label">{name}</p>
          <div className="flex flex-wrap gap-2">
            {vs!.map((v) => (
              <button key={v.id} disabled={v.stock === 0} onClick={() => setVariant(v.id)}
                className={`chip min-w-12 justify-center ${variant === v.id ? 'chip-on' : ''} disabled:opacity-40 disabled:line-through`}>{v.value}</button>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-5 flex items-center justify-between">
        <span className="field-label mb-0">Quantidade</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-10 w-10 rounded-full bg-ink-700 inline-flex items-center justify-center" aria-label="Diminuir"><Minus size={16} /></button>
          <span className="w-6 text-center font-semibold">{qty}</span>
          <button onClick={() => setQty((q) => Math.min(product.stock || 1, q + 1))} className="h-10 w-10 rounded-full bg-ink-700 inline-flex items-center justify-center" aria-label="Aumentar"><Plus size={16} /></button>
        </div>
      </div>

      <button disabled={product.stock === 0 || needsVariant} className="btn btn-primary w-full mt-6"
        onClick={() => { toast('Checkout chega em breve', { description: 'O pagamento com Mercado Pago entra na próxima etapa do LIVESHOP.' }); onClose() }}>
        {needsVariant ? `Escolha ${groups[0][0].toLowerCase()}` : 'Comprar agora'}
      </button>
    </Sheet>
  )
}
