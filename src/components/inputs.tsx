import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { normalizeTag } from '@/lib/format'
import { uploadImage } from '@/lib/upload'
import { useAuth } from '@/lib/auth'

/** Campo de hashtags: digite e aperte Enter, espaço ou vírgula. */
export function TagInput({ value, onChange, placeholder = 'blusadefrio' }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [text, setText] = useState('')
  const add = (raw: string) => {
    const t = normalizeTag(raw)
    if (t.length >= 2 && !value.includes(t)) onChange([...value, t])
    setText('')
  }
  return (
    <div className="input h-auto min-h-12 flex flex-wrap items-center gap-1.5 py-2">
      {value.map((t) => (
        <span key={t} className="chip chip-on h-8">
          <span className="hash">#</span>{t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remover ${t}`} className="-mr-2 h-8 w-8 inline-flex items-center justify-center"><X size={14} /></button>
        </span>
      ))}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (['Enter', ' ', ','].includes(e.key)) { e.preventDefault(); add(text) }
          if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1))
        }}
        onBlur={() => text && add(text)}
        placeholder={value.length ? '' : `#${placeholder}`}
        className="flex-1 min-w-[120px] bg-transparent outline-none h-8"
      />
    </div>
  )
}

/** Seletor de imagens com upload para o Supabase Storage. */
export function ImagePicker({ value, onChange, folder, max = 1, aspect = 'square' }: {
  value: string[]; onChange: (v: string[]) => void; folder: string; max?: number; aspect?: 'square' | 'wide' | 'tall'
}) {
  const { user } = useAuth()
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const ratio = { square: 'aspect-square', wide: 'aspect-[12/5]', tall: 'aspect-[9/16]' }[aspect]

  const pick = async (files: FileList | null) => {
    if (!files || !user) return
    setBusy(true)
    try {
      const room = max - value.length
      const urls = await Promise.all([...files].slice(0, room).map((f) => uploadImage(f, user.id, folder)))
      onChange(max === 1 ? urls.slice(0, 1) : [...value, ...urls])
    } catch (e) {
      toast.error('Não foi possível enviar a imagem', { description: e instanceof Error ? e.message : '' })
    } finally {
      setBusy(false)
      if (ref.current) ref.current.value = ''
    }
  }

  const canAdd = max === 1 || value.length < max
  return (
    <div className={`grid gap-2 ${max === 1 ? 'grid-cols-1' : 'grid-cols-3 sm:grid-cols-4'}`}>
      {value.map((url, i) => (
        <div key={url} className={`relative ${ratio} rounded-2xl overflow-hidden bg-ink-700`}>
          <img src={url} alt="" className="h-full w-full object-cover" />
          {i === 0 && max > 1 && <span className="absolute left-1.5 top-1.5 text-[10px] font-bold bg-tag text-ink rounded-full px-2 py-0.5">Capa</span>}
          <button type="button" onClick={() => onChange(value.filter((u) => u !== url))}
            className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full bg-ink/80 inline-flex items-center justify-center" aria-label="Remover imagem">
            <X size={14} />
          </button>
        </div>
      ))}
      {canAdd && (max > 1 || value.length === 0) && (
        <button type="button" onClick={() => ref.current?.click()} disabled={busy}
          className={`${ratio} rounded-2xl border-2 border-dashed border-ink-500 text-mist-400 flex flex-col items-center justify-center gap-1 hover:border-tag hover:text-tag transition-colors`}>
          {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          <span className="text-xs">{busy ? 'Enviando' : 'Adicionar foto'}</span>
        </button>
      )}
      {max === 1 && value.length > 0 && (
        <button type="button" onClick={() => ref.current?.click()} className="btn btn-ghost btn-sm justify-self-start">Trocar foto</button>
      )}
      <input ref={ref} type="file" accept="image/*" multiple={max > 1} hidden onChange={(e) => pick(e.target.files)} />
    </div>
  )
}
