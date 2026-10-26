import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'

/** Carrega dados assíncronos e expõe { data, loading, error, reload }. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)

  const run = useCallback(async () => {
    const id = ++seq.current
    setLoading(true)
    setError(null)
    try {
      const r = await fn()
      if (id === seq.current) setData(r)
    } catch (e) {
      if (id === seq.current) setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (id === seq.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { run() }, [run])
  return { data, loading, error, reload: run, setData }
}

/** Lança o erro do Supabase, se houver, e devolve os dados. */
export function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message)
  return r.data as T
}
