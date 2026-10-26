import { useEffect, type ReactNode } from 'react'
import { Loader2, Star, X } from 'lucide-react'
import { initials, money, compact } from '@/lib/format'

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'text-lg', md: 'text-xl', lg: 'text-4xl' }[size]
  return (
    <span className={`font-display font-extrabold tracking-tight ${s} inline-flex items-center gap-1.5`}>
      <span className="relative inline-flex">
        <span className="h-[0.9em] w-[1.25em] rounded-[0.28em] border-[0.13em] border-mist inline-flex items-center justify-center">
          <span className="h-0 w-0 border-y-[0.2em] border-y-transparent border-l-[0.3em] border-l-tag ml-[0.06em]" />
        </span>
        <span className="absolute -right-[0.16em] -top-[0.16em] h-[0.36em] w-[0.36em] rounded-full bg-onair ring-2 ring-ink animate-pulsedot" />
      </span>
      LIVESHOP
    </span>
  )
}

export function OnAir({ viewers, small }: { viewers?: number; small?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full bg-onair text-white font-bold ${small ? 'h-6 px-2 text-[11px]' : 'h-7 px-2.5 text-xs'}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulsedot" />
      AO VIVO
      {viewers != null && <span className="font-semibold opacity-90 pl-1 border-l border-white/40">{compact(viewers)}</span>}
    </span>
  )
}

export function StoreAvatar({ name, url, size = 40, ring }: { name: string; url?: string | null; size?: number; ring?: boolean }) {
  const cls = `rounded-full shrink-0 object-cover ${ring ? 'ring-2 ring-onair ring-offset-2 ring-offset-ink' : ''}`
  if (url) return <img src={url} alt="" width={size} height={size} className={cls} style={{ width: size, height: size }} />
  // cor estável a partir do nome
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return (
    <span className={`${cls} inline-flex items-center justify-center font-display font-bold text-ink`}
      style={{ width: size, height: size, background: `hsl(${hue} 85% 72%)`, fontSize: size * 0.38 }}>
      {initials(name)}
    </span>
  )
}

export function Price({ price, promo, size = 'md', hideOld }: { price: number; promo?: number | null; size?: 'sm' | 'md' | 'lg'; hideOld?: boolean }) {
  const main = { sm: 'text-base', md: 'text-lg', lg: 'text-3xl' }[size]
  return (
    <span className="inline-flex items-baseline gap-2 flex-wrap">
      <span className={`font-display font-extrabold text-tag ${main}`}>{money(promo ?? price)}</span>
      {!hideOld && promo != null && promo < price && <span className="text-sm text-mist-500 line-through">{money(price)}</span>}
    </span>
  )
}

export function Rating({ value, count }: { value: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-mist-300">
      <Star size={14} className="fill-tag text-tag" />
      <span className="font-semibold text-mist">{Number(value).toFixed(1).replace('.', ',')}</span>
      {count != null && <span>({compact(count)})</span>}
    </span>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-mist-400" role="status">
      <Loader2 className="animate-spin" size={20} /> {label ?? 'Carregando'}
    </div>
  )
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-14">
      <span className="font-display text-6xl font-extrabold text-ink-600 leading-none mb-4">#</span>
      <h3 className="text-xl font-bold text-mist mb-2 max-w-sm">{title}</h3>
      {children && <p className="text-mist-400 max-w-sm mb-5">{children}</p>}
      {action}
    </div>
  )
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-2xl border border-onair/50 bg-onair/10 text-mist px-4 py-3 text-sm">{message}</div>
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-black/60" aria-label="Fechar" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-[28px] bg-ink-800 border-t border-ink-600 safe-b">
        <div className="sticky top-0 bg-ink-800 flex items-center justify-between px-5 pt-4 pb-3 z-10">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-ink-700 inline-flex items-center justify-center" aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  )
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-center justify-between gap-4 py-3 cursor-pointer">
      <span>
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-mist-400">{hint}</span>}
      </span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 rounded-full transition-colors shrink-0 ${checked ? 'bg-tag' : 'bg-ink-600'}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${checked ? 'left-7' : 'left-1'}`} />
      </button>
    </label>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="block text-xs text-mist-500 mt-1">{hint}</span>}
    </label>
  )
}

export function PageHeader({ title, children, back }: { title: string; children?: ReactNode; back?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      {back}
      <h1 className="text-2xl md:text-3xl font-extrabold flex-1">{title}</h1>
      {children}
    </div>
  )
}
