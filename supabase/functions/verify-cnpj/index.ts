// LIVESHOP · verify-cnpj
// Consulta a situação cadastral do CNPJ na Receita Federal (via BrasilAPI, com
// fallback na CNPJ.ws) e grava o resultado na loja.
//
// POST { cnpj, dry: true }        → só consulta (usado no formulário, antes de salvar)
// POST { }                        → consulta o CNPJ da loja do usuário logado e grava
// POST { store_id }               → (admin) consulta e grava a loja indicada
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

function validCnpj(raw: string) {
  const d = raw.replace(/\D/g, '')
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false
  const calc = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const s = w.reduce((a, x, i) => a + Number(d[i]) * x, 0) % 11
    return s < 2 ? 0 : 11 - s
  }
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13])
}

interface Lookup {
  status: string
  legal_name: string | null
  trade_name: string | null
  city: string | null
  uf: string | null
  opened_at: string | null
  activity: string | null
  source: string
}

async function lookup(cnpj: string): Promise<Lookup | 'not_found'> {
  const timeout = (ms: number) => AbortSignal.timeout(ms)
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { signal: timeout(8000) })
    if (r.status === 404) return 'not_found'
    if (r.ok) {
      const j = await r.json()
      return {
        status: String(j.descricao_situacao_cadastral ?? '').toUpperCase(),
        legal_name: j.razao_social ?? null, trade_name: j.nome_fantasia || null,
        city: j.municipio ?? null, uf: j.uf ?? null, opened_at: j.data_inicio_atividade ?? null,
        activity: j.cnae_fiscal_descricao ?? null, source: 'brasilapi',
      }
    }
  } catch { /* tenta a próxima fonte */ }
  try {
    const r = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`, { signal: timeout(8000) })
    if (r.status === 404 || r.status === 400) return 'not_found'
    if (r.ok) {
      const j = await r.json()
      const e = j.estabelecimento ?? {}
      return {
        status: String(e.situacao_cadastral ?? '').toUpperCase(),
        legal_name: j.razao_social ?? null, trade_name: e.nome_fantasia || null,
        city: e.cidade?.nome ?? null, uf: e.estado?.sigla ?? null, opened_at: e.data_inicio_atividade ?? null,
        activity: e.atividade_principal?.descricao ?? null, source: 'cnpj.ws',
      }
    }
  } catch { /* sem fonte disponível */ }
  throw new Error('unavailable')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)

  let body: { cnpj?: string; dry?: boolean; store_id?: string } = {}
  try { body = await req.json() } catch { /* corpo vazio */ }

  const url = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  // Consulta avulsa (formulário de cadastro): não grava nada
  if (body.dry) {
    const cnpj = (body.cnpj ?? '').replace(/\D/g, '')
    if (!validCnpj(cnpj)) return json({ ok: false, error: 'CNPJ inválido. Confira os números.' }, 400)
    try {
      const r = await lookup(cnpj)
      if (r === 'not_found') return json({ ok: false, error: 'CNPJ não encontrado na Receita Federal.' }, 404)
      return json({ ok: r.status === 'ATIVA', ...r })
    } catch {
      return json({ ok: false, error: 'A consulta à Receita está indisponível agora. Tente de novo em alguns minutos.' }, 503)
    }
  }

  // Consulta que grava: precisa estar logado
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: userData } = await admin.auth.getUser(token)
  const user = userData?.user
  if (!user) return json({ error: 'Entre na sua conta para verificar o CNPJ.' }, 401)

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const isAdmin = profile?.role === 'admin'

  const q = admin.from('stores').select('id, owner_id, document, is_demo')
  const { data: store } = body.store_id && isAdmin ? await q.eq('id', body.store_id).maybeSingle() : await q.eq('owner_id', user.id).maybeSingle()
  if (!store) return json({ error: 'Loja não encontrada.' }, 404)

  const cnpj = (store.document ?? '').replace(/\D/g, '')
  if (!validCnpj(cnpj)) return json({ ok: false, error: 'O CNPJ cadastrado na loja é inválido.' }, 400)

  let result: Lookup | 'not_found'
  try { result = await lookup(cnpj) } catch {
    return json({ ok: false, error: 'A consulta à Receita está indisponível agora. Tente de novo em alguns minutos.' }, 503)
  }
  const status = result === 'not_found' ? 'NÃO ENCONTRADO' : result.status || 'DESCONHECIDA'
  const { error } = await admin.from('stores').update({
    cnpj_status: status,
    cnpj_legal_name: result === 'not_found' ? null : result.legal_name,
    cnpj_checked_at: new Date().toISOString(),
    cnpj_data: result === 'not_found' ? { not_found: true } : result,
  }).eq('id', store.id)
  if (error) return json({ ok: false, error: error.message }, 500)

  return json({ ok: status === 'ATIVA', status, ...(result === 'not_found' ? {} : result) })
})
