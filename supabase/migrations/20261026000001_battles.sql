-- =====================================================================
-- LIVESHOP · Batalhas do Bem
-- Duas lojas vendem o mesmo produto, pelo mesmo preço, numa live dupla.
-- Regra de divisão (aceita em termo por cada loja):
--   1. sai a comissão da plataforma
--   2. cada loja recebe de volta o custo das peças que ELA enviou
--   3. cada loja recebe de volta o frete que ELA pagou
--   4. o lucro que sobra é dividido em partes iguais
-- Assim o lucro de cada loja é sempre igual, não importa quem vendeu mais.
-- =====================================================================

-- Termo versionado: cada aceite guarda a versão que a loja leu
create table public.battle_terms (
  version int primary key,
  body text not null,
  created_at timestamptz not null default now()
);

insert into public.battle_terms (version, body) values (1, $terms$TERMO DE PARTICIPAÇÃO EM BATALHA DO BEM — LIVESHOP

1. Objeto. As lojas participantes realizam, em conjunto, uma live de vendas do mesmo produto, pelo mesmo preço de venda, na plataforma LIVESHOP ("Batalha do Bem").

2. Custo declarado. Cada loja declara que o custo unitário do produto é igual ao informado nesta batalha e que essa informação é verdadeira.

3. Divisão dos valores. Ao final da batalha, o valor de todas as vendas feitas por todas as lojas participantes é somado e dividido assim:
   a) é descontada a comissão da plataforma;
   b) cada loja recebe o custo declarado de cada unidade que ela mesma enviou;
   c) cada loja recebe de volta o frete que ela mesma pagou nos envios da batalha, de forma que o custo total de frete seja dividido igualmente;
   d) o lucro restante é dividido em partes iguais entre as lojas participantes.

4. Envio. Cada loja é responsável por enviar, no prazo informado na sua loja, os pedidos feitos com ela durante a batalha. A loja que não enviar no prazo perde sua parte do lucro referente a esses pedidos.

5. Devoluções e cancelamentos. Valores devolvidos a compradores por cancelamento, arrependimento ou defeito são descontados do total da batalha antes da divisão, de modo que o prejuízo também é dividido igualmente.

6. Estoque. Cada loja informa o estoque disponível para a batalha. Se uma loja esgotar, as demais podem continuar vendendo e a divisão segue a mesma regra.

7. Extrato. A plataforma disponibiliza a todas as participantes o extrato da batalha com o cálculo de cada etapa.

8. Aceite. Ao aceitar este termo, a loja declara que leu, entendeu e concorda com todas as condições acima. A plataforma registra a data, a hora e a versão do termo aceito.$terms$);

create table public.battles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'invited'
    check (status in ('invited','scheduled','live','ended','declined','cancelled')),
  host_store_id uuid not null references public.stores(id) on delete cascade,
  unit_price numeric(10,2) not null check (unit_price > 0),
  unit_cost numeric(10,2) not null check (unit_cost >= 0),
  commission_percent numeric(5,2) not null,            -- copiada da plataforma no momento da criação
  goal_units int check (goal_units is null or goal_units > 0),  -- meta conjunta de unidades
  goal_reward text,                                     -- ex: "Frete grátis para todos"
  terms_version int not null references public.battle_terms(version),
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  cover_url text,
  created_at timestamptz not null default now(),
  check (unit_cost <= unit_price)
);
create index battles_status_idx on public.battles(status);

create table public.battle_participants (
  battle_id uuid not null references public.battles(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  role text not null check (role in ('host','guest')),
  product_id uuid references public.products(id) on delete set null,
  stock_declared int check (stock_declared is null or stock_declared >= 0),
  declared_cost numeric(10,2),
  terms_version int references public.battle_terms(version),
  terms_accepted_at timestamptz,
  terms_accepted_by uuid references public.profiles(id),
  terms_accepted_ip text,
  -- Preenchidos pelos pedidos na fase de pagamento (por enquanto ficam em zero)
  units_sold int not null default 0 check (units_sold >= 0),
  refunded_amount numeric(10,2) not null default 0,
  shipping_paid numeric(10,2) not null default 0,
  primary key (battle_id, store_id)
);
create index battle_participants_store_idx on public.battle_participants(store_id);

alter table public.battle_terms enable row level security;
alter table public.battles enable row level security;
alter table public.battle_participants enable row level security;

create or replace function public.in_battle(p_battle uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.battle_participants bp
    join public.stores s on s.id = bp.store_id
    where bp.battle_id = p_battle and s.owner_id = auth.uid()
  );
$$;

create or replace function public.battle_is_public(p_battle uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.battles b where b.id = p_battle and b.status in ('scheduled','live','ended'))
     and not exists (
       select 1 from public.battle_participants bp
       where bp.battle_id = p_battle and not public.store_is_public(bp.store_id)
     );
$$;

create policy "battle_terms_read" on public.battle_terms for select using (true);
create policy "battle_terms_admin" on public.battle_terms for insert with check (public.is_admin());

create policy "battles_read" on public.battles for select
  using (public.battle_is_public(id) or public.in_battle(id) or public.is_admin());
create policy "battle_participants_read" on public.battle_participants for select
  using (public.battle_is_public(battle_id) or public.in_battle(battle_id) or public.is_admin());
-- Escrita só pelas funções abaixo (que conferem dono, preço e custo)

-- ---------------------------------------------------------------------
-- Cálculo do extrato (função pura: usada no simulador e no extrato real)
-- ---------------------------------------------------------------------
create or replace function public.battle_split(
  p_unit_price numeric,
  p_unit_cost numeric,
  p_commission_percent numeric,
  p_units int[],
  p_shipping numeric[] default null,
  p_refunds numeric[] default null
)
returns table (
  idx int, units int, gross numeric, cost_back numeric, shipping_back numeric,
  profit_share numeric, payout numeric, net_profit numeric,
  total_gross numeric, total_commission numeric, total_cost numeric, total_shipping numeric,
  total_refunds numeric, total_profit numeric
)
language plpgsql immutable set search_path = '' as $$
declare
  n int := coalesce(array_length(p_units, 1), 0);
  v_units int; v_ship numeric; v_ref numeric;
  t_gross numeric := 0; t_cost numeric := 0; t_ship numeric := 0; t_ref numeric := 0;
  t_comm numeric; t_profit numeric; share numeric;
  i int;
begin
  if n = 0 then return; end if;
  for i in 1..n loop
    t_gross := t_gross + coalesce(p_units[i], 0) * p_unit_price;
    t_cost  := t_cost  + coalesce(p_units[i], 0) * p_unit_cost;
    t_ship  := t_ship  + coalesce(p_shipping[i], 0);
    t_ref   := t_ref   + coalesce(p_refunds[i], 0);
  end loop;
  t_comm := round((t_gross - t_ref) * p_commission_percent / 100, 2);
  t_profit := t_gross - t_ref - t_comm - t_cost - t_ship;
  share := round(t_profit / n, 2);
  for i in 1..n loop
    v_units := coalesce(p_units[i], 0);
    v_ship := coalesce(p_shipping[i], 0);
    idx := i; units := v_units;
    gross := v_units * p_unit_price;
    cost_back := v_units * p_unit_cost;
    shipping_back := v_ship;
    profit_share := share;
    payout := cost_back + shipping_back + share;
    net_profit := share;   -- lucro real = o que recebe menos custo e frete que pagou
    total_gross := t_gross; total_commission := t_comm; total_cost := t_cost;
    total_shipping := t_ship; total_refunds := t_ref; total_profit := t_profit;
    return next;
  end loop;
end $$;

-- Extrato real da batalha, por loja
create or replace function public.battle_statement(p_battle uuid)
returns table (
  store_id uuid, store_name text, units int, gross numeric, cost_back numeric, shipping_back numeric,
  profit_share numeric, payout numeric, total_gross numeric, total_commission numeric, total_cost numeric,
  total_shipping numeric, total_refunds numeric, total_profit numeric
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  b public.battles;
  v_stores uuid[]; v_names text[]; v_units int[]; v_ship numeric[]; v_ref numeric[];
begin
  select * into b from public.battles where id = p_battle;
  if b.id is null then raise exception 'Batalha não encontrada'; end if;
  if not (public.in_battle(p_battle) or public.is_admin()) then raise exception 'Só as lojas participantes veem o extrato'; end if;
  select array_agg(bp.store_id order by (bp.role = 'host') desc, s.name), array_agg(s.name order by (bp.role = 'host') desc, s.name),
         array_agg(bp.units_sold order by (bp.role = 'host') desc, s.name), array_agg(bp.shipping_paid order by (bp.role = 'host') desc, s.name),
         array_agg(bp.refunded_amount order by (bp.role = 'host') desc, s.name)
    into v_stores, v_names, v_units, v_ship, v_ref
  from public.battle_participants bp join public.stores s on s.id = bp.store_id
  where bp.battle_id = p_battle;
  return query
  select v_stores[x.idx], v_names[x.idx], x.units, x.gross, x.cost_back, x.shipping_back, x.profit_share, x.payout,
         x.total_gross, x.total_commission, x.total_cost, x.total_shipping, x.total_refunds, x.total_profit
  from public.battle_split(b.unit_price, b.unit_cost, b.commission_percent, v_units, v_ship, v_ref) x;
end $$;

-- ---------------------------------------------------------------------
-- Sugestão de parceiras: lojas aprovadas com produto parecido e mesmo preço
-- ---------------------------------------------------------------------
create or replace function public.battle_partner_suggestions(p_product uuid)
returns table (store_id uuid, store_name text, store_slug text, store_logo text, city text, state text, rating numeric,
               product_id uuid, product_name text, price numeric, shared_tags text[], image text)
language plpgsql stable security definer set search_path = public, extensions as $$
#variable_conflict use_column
declare
  v_store uuid; v_price numeric; v_name text;
begin
  select p.store_id, coalesce(p.promo_price, p.price), p.name into v_store, v_price, v_name from public.products p where p.id = p_product;
  if v_store is null or not public.owns_store(v_store) then raise exception 'Produto não é da sua loja'; end if;
  return query
  with my_tags as (select ph.hashtag_id from public.product_hashtags ph where ph.product_id = p_product)
  select s.id, s.name, s.slug, s.logo_url, s.city, s.state, s.rating, p.id, p.name, coalesce(p.promo_price, p.price),
         coalesce((select array_agg(h.tag) from public.product_hashtags ph join public.hashtags h on h.id = ph.hashtag_id
                   where ph.product_id = p.id and ph.hashtag_id in (select hashtag_id from my_tags)), '{}'),
         (select pi.url from public.product_images pi where pi.product_id = p.id order by pi.position limit 1)
  from public.products p
  join public.stores s on s.id = p.store_id
  where s.id <> v_store and public.product_is_public(p.id)
    and coalesce(p.promo_price, p.price) = v_price
    and (exists (select 1 from public.product_hashtags ph where ph.product_id = p.id and ph.hashtag_id in (select hashtag_id from my_tags))
         or extensions.similarity(lower(p.name), lower(v_name)) > 0.3)
  order by extensions.similarity(lower(p.name), lower(v_name)) desc, s.rating desc
  limit 20;
end $$;

-- ---------------------------------------------------------------------
-- Criar batalha (a loja anfitriã convida outra e já aceita o termo)
-- ---------------------------------------------------------------------
create or replace function public.create_battle(
  p_title text,
  p_product uuid,
  p_guest_store uuid,
  p_unit_cost numeric,
  p_stock int,
  p_scheduled_at timestamptz,
  p_goal_units int default null,
  p_goal_reward text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_store uuid; v_price numeric; v_battle uuid; v_terms int; v_comm numeric;
begin
  select p.store_id, coalesce(p.promo_price, p.price) into v_store, v_price from public.products p where p.id = p_product;
  if v_store is null or not public.owns_store(v_store) then raise exception 'Produto não é da sua loja'; end if;
  if not exists (select 1 from public.stores where id = v_store and status = 'approved') then raise exception 'Sua loja precisa estar aprovada'; end if;
  if p_guest_store = v_store then raise exception 'Convide outra loja'; end if;
  if not public.store_is_public(p_guest_store) then raise exception 'Loja convidada indisponível'; end if;
  if p_unit_cost is null or p_unit_cost < 0 or p_unit_cost > v_price then raise exception 'Custo unitário inválido'; end if;
  if p_scheduled_at is null or p_scheduled_at < now() then raise exception 'Escolha uma data futura'; end if;

  select max(version) into v_terms from public.battle_terms;
  select commission_percent into v_comm from public.platform_settings where id = 1;

  insert into public.battles (title, host_store_id, unit_price, unit_cost, commission_percent, goal_units, goal_reward, terms_version, scheduled_at,
                              cover_url)
  values (btrim(p_title), v_store, v_price, p_unit_cost, v_comm, p_goal_units, nullif(btrim(p_goal_reward), ''), v_terms, p_scheduled_at,
          (select pi.url from public.product_images pi where pi.product_id = p_product order by pi.position limit 1))
  returning id into v_battle;

  insert into public.battle_participants (battle_id, store_id, role, product_id, stock_declared, declared_cost,
                                          terms_version, terms_accepted_at, terms_accepted_by, terms_accepted_ip)
  values (v_battle, v_store, 'host', p_product, p_stock, p_unit_cost, v_terms, now(), auth.uid(),
          coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', null));
  insert into public.battle_participants (battle_id, store_id, role) values (v_battle, p_guest_store, 'guest');
  return v_battle;
end $$;

-- Loja convidada aceita: escolhe o produto dela (mesmo preço), confirma o custo e aceita o termo
create or replace function public.accept_battle(p_battle uuid, p_product uuid, p_stock int, p_declared_cost numeric)
returns void language plpgsql security definer set search_path = public as $$
declare
  b public.battles; v_store uuid; v_price numeric;
begin
  select * into b from public.battles where id = p_battle for update;
  if b.id is null or b.status <> 'invited' then raise exception 'Este convite não está mais aberto'; end if;
  select bp.store_id into v_store from public.battle_participants bp
    join public.stores s on s.id = bp.store_id
    where bp.battle_id = p_battle and s.owner_id = auth.uid() and bp.terms_accepted_at is null;
  if v_store is null then raise exception 'Você não tem convite pendente nesta batalha'; end if;
  select coalesce(p.promo_price, p.price) into v_price from public.products p where p.id = p_product and p.store_id = v_store and p.active;
  if v_price is null then raise exception 'Escolha um produto ativo da sua loja'; end if;
  if v_price <> b.unit_price then raise exception 'O produto precisa ter o mesmo preço da batalha (R$ %)', b.unit_price; end if;
  if p_declared_cost is distinct from b.unit_cost then raise exception 'O custo declarado precisa ser igual ao da batalha (R$ %)', b.unit_cost; end if;

  update public.battle_participants set product_id = p_product, stock_declared = p_stock, declared_cost = p_declared_cost,
    terms_version = b.terms_version, terms_accepted_at = now(), terms_accepted_by = auth.uid(),
    terms_accepted_ip = coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', null)
  where battle_id = p_battle and store_id = v_store;

  if not exists (select 1 from public.battle_participants where battle_id = p_battle and terms_accepted_at is null) then
    update public.battles set status = 'scheduled' where id = p_battle;
  end if;
end $$;

create or replace function public.decline_battle(p_battle uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.in_battle(p_battle) then raise exception 'Sem permissão'; end if;
  update public.battles set status = case
      when host_store_id in (select id from public.stores where owner_id = auth.uid()) then 'cancelled' else 'declined' end
  where id = p_battle and status in ('invited','scheduled');
end $$;

-- Entrar ao vivo / encerrar (qualquer participante; vídeo real na fase 2)
create or replace function public.set_battle_status(p_battle uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare b public.battles;
begin
  if not (public.in_battle(p_battle) or public.is_admin()) then raise exception 'Sem permissão'; end if;
  select * into b from public.battles where id = p_battle;
  if p_status = 'live' and b.status = 'scheduled' then
    update public.battles set status = 'live', started_at = now() where id = p_battle;
  elsif p_status = 'ended' and b.status = 'live' then
    update public.battles set status = 'ended', ended_at = now() where id = p_battle;
  else
    raise exception 'Mudança de status não permitida';
  end if;
end $$;

-- Lista pública de batalhas (home)
create or replace function public.public_battles(p_limit int default 12)
returns table (battle_id uuid, title text, status text, scheduled_at timestamptz, unit_price numeric, goal_units int,
               goal_reward text, cover_url text, units_total int, stores jsonb)
language sql stable security definer set search_path = public as $$
  select b.id, b.title, b.status, b.scheduled_at, b.unit_price, b.goal_units, b.goal_reward, b.cover_url,
         (select coalesce(sum(bp.units_sold), 0)::int from public.battle_participants bp where bp.battle_id = b.id),
         (select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'slug', s.slug, 'logo', s.logo_url, 'city', s.city, 'state', s.state, 'role', bp.role) order by (bp.role = 'host') desc, s.name)
            from public.battle_participants bp join public.stores s on s.id = bp.store_id where bp.battle_id = b.id)
  from public.battles b
  where b.status in ('scheduled','live') and public.battle_is_public(b.id)
    and (b.status = 'live' or b.scheduled_at > now() - interval '2 hours')
  order by (b.status = 'live') desc, b.scheduled_at
  limit p_limit;
$$;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.battles, public.battle_participants;
  end if;
end $$;

revoke execute on function public.create_battle(text, uuid, uuid, numeric, int, timestamptz, int, text),
  public.accept_battle(uuid, uuid, int, numeric), public.decline_battle(uuid), public.set_battle_status(uuid, text),
  public.battle_statement(uuid), public.battle_partner_suggestions(uuid) from public, anon;
grant execute on function public.create_battle(text, uuid, uuid, numeric, int, timestamptz, int, text),
  public.accept_battle(uuid, uuid, int, numeric), public.decline_battle(uuid), public.set_battle_status(uuid, text),
  public.battle_statement(uuid), public.battle_partner_suggestions(uuid) to authenticated;
grant execute on function public.battle_split(numeric, numeric, numeric, int[], numeric[], numeric[]), public.public_battles(int) to anon, authenticated;
