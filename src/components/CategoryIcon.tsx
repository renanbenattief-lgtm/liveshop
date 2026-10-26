import { Baby, Cookie, Dumbbell, Footprints, Lock, PawPrint, Shirt, Smartphone, Sofa, Sparkles, Tag, Watch, type LucideIcon } from 'lucide-react'

const map: Record<string, LucideIcon> = {
  shirt: Shirt, footprints: Footprints, sparkles: Sparkles, smartphone: Smartphone, sofa: Sofa, baby: Baby,
  dumbbell: Dumbbell, watch: Watch, 'paw-print': PawPrint, cookie: Cookie, lock: Lock, tag: Tag,
}
export const CATEGORY_ICONS = Object.keys(map)
export function CategoryIcon({ name, size = 20 }: { name: string; size?: number }) {
  const I = map[name] ?? Tag
  return <I size={size} />
}
