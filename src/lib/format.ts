const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const money = (v: number | null | undefined) => (v == null ? '' : brl.format(Number(v)))

export const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',')} mil` : String(n)

export function whenLabel(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMin = Math.round((d.getTime() - now.getTime()) / 60000)
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (diffMin <= 0) return 'começando'
  if (diffMin < 60) return `em ${diffMin} min`
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return `hoje, ${time}`
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1)
  if (d.toDateString() === tomorrow.toDateString()) return `amanhã, ${time}`
  return `${d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}, ${time}`
}

export function elapsed(iso: string | null) {
  if (!iso) return ''
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  return m < 60 ? `há ${m} min` : `há ${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`
}

export const effective = (p: { price: number; promo_price: number | null }) => p.promo_price ?? p.price

export function shippingLabel(s: { free_shipping_min: number | null; fast_delivery?: boolean; shipping_days?: number }) {
  if (s.free_shipping_min == null) return null
  return Number(s.free_shipping_min) === 0 ? 'Frete grátis' : `Frete grátis acima de ${money(s.free_shipping_min)}`
}

export function slugify(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48)
}

export function normalizeTag(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 40)
}

export const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
