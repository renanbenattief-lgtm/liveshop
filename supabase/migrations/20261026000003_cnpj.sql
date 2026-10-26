-- =====================================================================
-- LIVESHOP · Toda loja precisa de CNPJ ATIVO na Receita Federal para vender
-- A situação é consultada pela função "verify-cnpj" (BrasilAPI) e gravada
-- aqui; o lojista não consegue alterar esses campos por conta própria.
-- =====================================================================

alter table public.stores
  add column cnpj_status text,                 -- situação cadastral na Receita (ex.: ATIVA, INAPTA, BAIXADA)
  add column cnpj_legal_name text,             -- razão social
  add column cnpj_checked_at timestamptz,      -- última consulta
  add column cnpj_data jsonb,                  -- resposta resumida da consulta
  add column is_demo boolean not null default false;  -- lojas de exemplo (não exigem CNPJ)

-- As 8 lojas de exemplo continuam funcionando sem CNPJ
update public.stores set is_demo = true where owner_id is null;

-- Validação dos dígitos verificadores do CNPJ
create or replace function public.cnpj_is_valid(p text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  d text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
  w1 int[] := array[5,4,3,2,9,8,7,6,5,4,3,2];
  w2 int[] := array[6,5,4,3,2,9,8,7,6,5,4,3,2];
  s int; r int; i int;
begin
  if length(d) <> 14 or d ~ '^(\d)\1{13}$' then return false; end if;
  s := 0; for i in 1..12 loop s := s + substr(d, i, 1)::int * w1[i]; end loop;
  r := s % 11; r := case when r < 2 then 0 else 11 - r end;
  if r <> substr(d, 13, 1)::int then return false; end if;
  s := 0; for i in 1..13 loop s := s + substr(d, i, 1)::int * w2[i]; end loop;
  r := s % 11; r := case when r < 2 then 0 else 11 - r end;
  return r = substr(d, 14, 1)::int;
end $$;

-- Um CNPJ só pode estar em uma loja
create unique index stores_document_unique on public.stores(document) where document is not null and document <> '';

-- Pode vender? (CNPJ ativo ou loja de exemplo)
create or replace function public.store_cnpj_ok(p_store uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.stores where id = p_store and (is_demo or upper(coalesce(cnpj_status, '')) = 'ATIVA'));
$$;

-- Regras de proteção da loja (substitui a versão anterior)
create or replace function public.protect_store_fields()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_service boolean := coalesce(current_setting('request.jwt.claims', true)::json->>'role', '') = 'service_role'
                       or session_user in ('postgres', 'supabase_admin');
begin
  -- novas lojas: só CNPJ, com dígitos válidos
  if tg_op = 'INSERT' and not new.is_demo then
    new.document := regexp_replace(coalesce(new.document, ''), '\D', '', 'g');
    new.document_type := 'cnpj';
    if not public.cnpj_is_valid(new.document) then
      raise exception 'CNPJ inválido. Confira os números.';
    end if;
  elsif tg_op = 'UPDATE' and new.document is distinct from old.document and not new.is_demo then
    new.document := regexp_replace(coalesce(new.document, ''), '\D', '', 'g');
    new.document_type := 'cnpj';
    if not public.cnpj_is_valid(new.document) then
      raise exception 'CNPJ inválido. Confira os números.';
    end if;
  end if;

  if not (public.is_admin() or v_service) then
    if tg_op = 'INSERT' then
      new.status := 'pending';
      new.rating := 0;
      new.rating_count := 0;
      new.is_demo := false;
      new.cnpj_status := null; new.cnpj_legal_name := null; new.cnpj_checked_at := null; new.cnpj_data := null;
    else
      new.status := old.status;
      new.status_reason := old.status_reason;
      new.rating := old.rating;
      new.rating_count := old.rating_count;
      new.owner_id := old.owner_id;
      new.is_demo := old.is_demo;
      if new.document is distinct from old.document then
        -- trocou o CNPJ: precisa consultar de novo
        new.cnpj_status := null; new.cnpj_legal_name := null; new.cnpj_checked_at := null; new.cnpj_data := null;
      else
        new.cnpj_status := old.cnpj_status; new.cnpj_legal_name := old.cnpj_legal_name;
        new.cnpj_checked_at := old.cnpj_checked_at; new.cnpj_data := old.cnpj_data;
      end if;
    end if;
  end if;

  -- ninguém aprova loja sem CNPJ ativo
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved')
     and not new.is_demo and upper(coalesce(new.cnpj_status, '')) <> 'ATIVA' then
    raise exception 'Só é possível aprovar lojas com CNPJ ATIVO na Receita (situação atual: %)', coalesce(new.cnpj_status, 'não consultado');
  end if;
  return new;
end $$;

-- Se uma consulta nova mostrar CNPJ não ativo, a loja aprovada é suspensa automaticamente
create or replace function public.suspend_on_inactive_cnpj()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not new.is_demo and new.status = 'approved' and new.cnpj_checked_at is distinct from old.cnpj_checked_at
     and upper(coalesce(new.cnpj_status, '')) <> 'ATIVA' then
    update public.stores set status = 'suspended',
      status_reason = 'CNPJ com situação ' || coalesce(new.cnpj_status, 'desconhecida') || ' na Receita Federal. Regularize e peça uma nova verificação.'
    where id = new.id;
  end if;
  return null;
end $$;
create trigger stores_suspend_inactive_cnpj after update of cnpj_status, cnpj_checked_at on public.stores
  for each row execute function public.suspend_on_inactive_cnpj();

-- Entrar ao vivo exige CNPJ ativo
create or replace function public.start_live(p_live uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_store uuid;
begin
  select store_id into v_store from public.lives where id = p_live;
  if not public.owns_store(v_store) then raise exception 'Sem permissão'; end if;
  if not exists (select 1 from public.stores where id = v_store and status = 'approved') then
    raise exception 'Sua loja precisa ser aprovada antes de entrar ao vivo';
  end if;
  if not public.store_cnpj_ok(v_store) then
    raise exception 'Seu CNPJ precisa estar ATIVO na Receita Federal para vender';
  end if;
  update public.lives set status = 'ended', ended_at = now() where store_id = v_store and status = 'live' and id <> p_live;
  update public.lives set status = 'live', started_at = now(), ended_at = null, viewers_count = 0 where id = p_live;
end $$;

-- Batalhas também exigem CNPJ ativo das duas lojas
create or replace function public.battle_cnpj_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.store_cnpj_ok(new.store_id) then
    raise exception 'A loja precisa ter CNPJ ATIVO na Receita Federal para participar de batalhas';
  end if;
  return new;
end $$;
create trigger battle_participants_cnpj before insert on public.battle_participants
  for each row execute function public.battle_cnpj_guard();

revoke execute on function public.suspend_on_inactive_cnpj(), public.battle_cnpj_guard() from public, anon, authenticated;
grant execute on function public.cnpj_is_valid(text), public.store_cnpj_ok(uuid) to anon, authenticated;
