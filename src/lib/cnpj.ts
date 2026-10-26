import { supabase } from './supabase'

export const onlyDigits = (s: string) => s.replace(/\D/g, '')

/** 00.000.000/0000-00 */
export function formatCnpj(s: string | null | undefined) {
  const d = onlyDigits(s ?? '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function cnpjIsValid(raw: string) {
  const d = onlyDigits(raw)
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false
  const calc = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const s = w.reduce((a, x, i) => a + Number(d[i]) * x, 0) % 11
    return s < 2 ? 0 : 11 - s
  }
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13])
}

export interface CnpjResult {
  ok: boolean
  status?: string
  legal_name?: string | null
  trade_name?: string | null
  city?: string | null
  uf?: string | null
  opened_at?: string | null
  activity?: string | null
  error?: string
  unavailable?: boolean
}

async function call(body: Record<string, unknown>): Promise<CnpjResult> {
  const { data, error } = await supabase.functions.invoke('verify-cnpj', { body })
  if (error) {
    // a função devolve a mensagem no corpo mesmo quando o status não é 200
    const ctx = (error as { context?: Response }).context
    let parsed: CnpjResult | null = null
    try { parsed = ctx ? await ctx.json() : null } catch { /* sem corpo */ }
    const status = ctx?.status
    return { ok: false, error: parsed?.error ?? 'Não foi possível consultar o CNPJ agora.', unavailable: status === 503 || !status }
  }
  return data as CnpjResult
}

/** Consulta sem gravar (formulário). */
export const checkCnpj = (cnpj: string) => call({ cnpj: onlyDigits(cnpj), dry: true })

/** Consulta e grava na loja do usuário (ou na loja indicada, se for admin). */
export const verifyStoreCnpj = (storeId?: string) => call(storeId ? { store_id: storeId } : {})

export const cnpjActive = (s: { is_demo?: boolean; cnpj_status?: string | null }) =>
  !!s.is_demo || (s.cnpj_status ?? '').toUpperCase() === 'ATIVA'
