-- =====================================================================
-- LIVESHOP · Fase 1 · Segurança (RLS), storage e busca
-- =====================================================================

-- ---------------------------------------------------------------------
-- Visibilidade pública
-- Por enquanto nada de categoria adulta aparece para o público.
-- A futura área +18 vai ter regras próprias.
-- ---------------------------------------------------------------------
create or replace function public.store_is_public(p_store uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.stores s
    left join public.categories c on c.id = s.category_id
    where s.id = p_store and s.status = 'approved' and coalesce(c.is_adult, false) = false
  );
$$;

create or replace function public.product_is_public(p_product uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.products p
    left join public.categories c on c.id = p.category_id
    where p.id = p_product and p.active and coalesce(c.is_adult, false) = false
      and public.store_is_public(p.store_id)
  );
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.platform_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.hashtags enable row level security;
alter table public.product_hashtags enable row level security;
alter table public.lives enable row level security;
alter table public.live_products enable row level security;
alter table public.live_hashtags enable row level security;
alter table public.store_followers enable row level security;
alter table public.live_reminders enable row level security;

-- platform_settings: todos leem a comissão; só admin altera
create policy "settings_read" on public.platform_settings for select using (true);
create policy "settings_admin_update" on public.platform_settings for update using (public.is_admin()) with check (public.is_admin());

-- profiles
create policy "profiles_read_own_or_admin" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- addresses
create policy "addresses_own" on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- categories
create policy "categories_read" on public.categories for select using (is_adult = false or public.is_admin());
create policy "categories_admin_write" on public.categories for all using (public.is_admin()) with check (public.is_admin());

-- stores
create policy "stores_read" on public.stores for select
  using (public.store_is_public(id) or owner_id = auth.uid() or public.is_admin());
create policy "stores_insert_own" on public.stores for insert
  with check (owner_id = auth.uid());
create policy "stores_update_own_or_admin" on public.stores for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy "stores_delete_admin" on public.stores for delete using (public.is_admin());

-- products
create policy "products_read" on public.products for select
  using (public.product_is_public(id) or public.owns_store(store_id) or public.is_admin());
create policy "products_write_owner" on public.products for all
  using (public.owns_store(store_id) or public.is_admin())
  with check (public.owns_store(store_id) or public.is_admin());

-- product_images / variants / hashtags seguem o produto
create policy "product_images_read" on public.product_images for select
  using (public.product_is_public(product_id) or exists (select 1 from public.products p where p.id = product_id and (public.owns_store(p.store_id) or public.is_admin())));
create policy "product_images_write" on public.product_images for all
  using (exists (select 1 from public.products p where p.id = product_id and (public.owns_store(p.store_id) or public.is_admin())))
  with check (exists (select 1 from public.products p where p.id = product_id and (public.owns_store(p.store_id) or public.is_admin())));

create policy "product_variants_read" on public.product_variants for select
  using (public.product_is_public(product_id) or exists (select 1 from public.products p where p.id = product_id and (public.owns_store(p.store_id) or public.is_admin())));
create policy "product_variants_write" on public.product_variants for all
  using (exists (select 1 from public.products p where p.id = product_id and (public.owns_store(p.store_id) or public.is_admin())))
  with check (exists (select 1 from public.products p where p.id = product_id and (public.owns_store(p.store_id) or public.is_admin())));

create policy "hashtags_read" on public.hashtags for select using (true);
create policy "product_hashtags_read" on public.product_hashtags for select using (true);
create policy "live_hashtags_read" on public.live_hashtags for select using (true);
-- escrita de hashtags acontece só pelas funções set_product_tags / set_live_tags

-- lives
create policy "lives_read" on public.lives for select
  using (public.store_is_public(store_id) or public.owns_store(store_id) or public.is_admin());
create policy "lives_write_owner" on public.lives for all
  using (public.owns_store(store_id) or public.is_admin())
  with check (public.owns_store(store_id) or public.is_admin());

create policy "live_products_read" on public.live_products for select
  using (exists (select 1 from public.lives l where l.id = live_id and (public.store_is_public(l.store_id) or public.owns_store(l.store_id) or public.is_admin())));
create policy "live_products_write" on public.live_products for all
  using (exists (select 1 from public.lives l where l.id = live_id and (public.owns_store(l.store_id) or public.is_admin())))
  with check (exists (select 1 from public.lives l where l.id = live_id and (public.owns_store(l.store_id) or public.is_admin())));

-- seguidores e lembretes
create policy "followers_own" on public.store_followers for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "followers_store_owner_read" on public.store_followers for select using (public.owns_store(store_id) or public.is_admin());
create policy "reminders_own" on public.live_reminders for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reminders_store_owner_read" on public.live_reminders for select using (public.owns_store(store_id) or public.is_admin());

-- Contagem de seguidores é pública
create or replace function public.store_follower_count(p_store uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.store_followers where store_id = p_store;
$$;

-- ---------------------------------------------------------------------
-- Storage: bucket público "media"; cada usuário grava na própria pasta
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

-- bucket público: as imagens abrem pela URL pública, sem política de listagem
create policy "media_user_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_user_update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_user_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- Busca de lives
-- O comprador digita "blusa de frio" ou "#blusadefrio" e recebe as lives
-- (ao vivo primeiro, depois agendadas) que vendem aquilo.
-- ---------------------------------------------------------------------
create or replace function public.search_lives(
  p_query text default null,
  p_free_shipping boolean default false,
  p_fast boolean default false,
  p_state text default null,
  p_city text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_min_rating numeric default null,
  p_only_live boolean default false,
  p_category text default null,
  p_sort text default 'viewers',
  p_user_state text default null,
  p_limit int default 48
)
returns table (
  live_id uuid,
  title text,
  cover_url text,
  status text,
  viewers_count int,
  scheduled_at timestamptz,
  started_at timestamptz,
  store_id uuid,
  store_name text,
  store_slug text,
  store_logo text,
  store_city text,
  store_state text,
  store_rating numeric,
  free_shipping_min numeric,
  fast_delivery boolean,
  min_price numeric,
  product_count int,
  tags text[],
  featured jsonb
)
language plpgsql stable security definer set search_path = public, extensions as $$
#variable_conflict use_column
declare
  v_text text := nullif(lower(extensions.unaccent(btrim(regexp_replace(coalesce(p_query, ''), '^#', '')))), '');
  v_tag text := nullif(public.normalize_tag(p_query), '');
begin
  return query
  with base as (
    select l.*, s.name as s_name, s.slug as s_slug, s.logo_url as s_logo, s.city as s_city, s.state as s_state,
           s.rating as s_rating, s.free_shipping_min as s_fsm, s.fast_delivery as s_fast, s.category_id as s_cat
    from public.lives l
    join public.stores s on s.id = l.store_id
    left join public.categories sc on sc.id = s.category_id
    where s.status = 'approved' and coalesce(sc.is_adult, false) = false
      and l.status in ('live', 'scheduled')
      and (not p_only_live or l.status = 'live')
      and (l.status = 'live' or l.scheduled_at is null or l.scheduled_at > now() - interval '2 hours')
      and (not p_free_shipping or s.free_shipping_min is not null)
      and (not p_fast or s.fast_delivery)
      and (p_state is null or s.state = upper(p_state))
      and (p_city is null or lower(extensions.unaccent(s.city)) = lower(extensions.unaccent(p_city)))
      and (p_min_rating is null or s.rating >= p_min_rating)
  ),
  lp as (
    select lpr.live_id, p.id, p.name, p.price, p.promo_price, p.category_id,
           coalesce(p.promo_price, p.price) as eff_price
    from public.live_products lpr
    join public.products p on p.id = lpr.product_id
    left join public.categories c on c.id = p.category_id
    where p.active and coalesce(c.is_adult, false) = false
      and lpr.live_id in (select b.id from base b)
  ),
  matched as (
    select b.* from base b
    where (
      v_text is null
      or lower(extensions.unaccent(b.title)) like '%' || v_text || '%'
      or exists (
        select 1 from public.live_hashtags lh join public.hashtags h on h.id = lh.hashtag_id
        where lh.live_id = b.id and v_tag is not null and h.tag like v_tag || '%'
      )
      or exists (
        select 1 from lp where lp.live_id = b.id and (
          lower(extensions.unaccent(lp.name)) like '%' || v_text || '%'
          or exists (
            select 1 from public.product_hashtags ph join public.hashtags h on h.id = ph.hashtag_id
            where ph.product_id = lp.id and v_tag is not null and h.tag like v_tag || '%'
          )
        )
      )
    )
    and (p_min_price is null or exists (select 1 from lp where lp.live_id = b.id and lp.eff_price >= p_min_price))
    and (p_max_price is null or exists (select 1 from lp where lp.live_id = b.id and lp.eff_price <= p_max_price))
    and (p_category is null
         or exists (select 1 from public.categories c where c.slug = p_category and c.id = b.s_cat)
         or exists (select 1 from lp join public.categories c on c.id = lp.category_id where lp.live_id = b.id and c.slug = p_category))
  )
  select
    m.id, m.title, m.cover_url, m.status, m.viewers_count, m.scheduled_at, m.started_at,
    m.store_id, m.s_name, m.s_slug, m.s_logo, m.s_city, m.s_state, m.s_rating, m.s_fsm, m.s_fast,
    (select min(lp.eff_price) from lp where lp.live_id = m.id),
    (select count(*)::int from lp where lp.live_id = m.id),
    coalesce((select array_agg(h.tag order by h.tag) from public.live_hashtags lh join public.hashtags h on h.id = lh.hashtag_id where lh.live_id = m.id), '{}'),
    (
      select jsonb_build_object(
        'id', p.id, 'name', p.name, 'price', p.price, 'promo_price', p.promo_price,
        'image', (select pi.url from public.product_images pi where pi.product_id = p.id order by pi.position limit 1)
      )
      from public.products p
      where p.id = coalesce(m.featured_product_id, (select lp.id from lp where lp.live_id = m.id order by lp.eff_price limit 1))
    )
  from matched m
  order by
    case when m.status = 'live' then 0 else 1 end,
    case when p_sort = 'nearest' and p_user_state is not null then (m.s_state <> upper(p_user_state))::int else 0 end,
    case when p_sort = 'rating' then m.s_rating end desc nulls last,
    case when p_sort = 'price' then (select min(lp.eff_price) from lp where lp.live_id = m.id) end asc nulls last,
    case when m.status = 'live' then m.viewers_count end desc nulls last,
    m.scheduled_at asc nulls last
  limit p_limit;
end $$;

-- ---------------------------------------------------------------------
-- Busca de lojas (usada quando não há live para a busca)
-- ---------------------------------------------------------------------
create or replace function public.search_stores(
  p_query text default null,
  p_free_shipping boolean default false,
  p_fast boolean default false,
  p_state text default null,
  p_city text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_min_rating numeric default null,
  p_category text default null,
  p_limit int default 24
)
returns table (
  store_id uuid,
  name text,
  slug text,
  logo_url text,
  cover_url text,
  city text,
  state text,
  rating numeric,
  free_shipping_min numeric,
  fast_delivery boolean,
  matched_products int,
  min_price numeric,
  sample_image text,
  is_live boolean,
  live_id uuid,
  next_live_at timestamptz
)
language plpgsql stable security definer set search_path = public, extensions as $$
#variable_conflict use_column
declare
  v_text text := nullif(lower(extensions.unaccent(btrim(regexp_replace(coalesce(p_query, ''), '^#', '')))), '');
  v_tag text := nullif(public.normalize_tag(p_query), '');
begin
  return query
  with prods as (
    select p.*, coalesce(p.promo_price, p.price) as eff_price
    from public.products p
    join public.stores s on s.id = p.store_id
    left join public.categories c on c.id = p.category_id
    left join public.categories sc on sc.id = s.category_id
    where p.active and s.status = 'approved'
      and coalesce(c.is_adult, false) = false and coalesce(sc.is_adult, false) = false
      and (v_text is null
           or lower(extensions.unaccent(p.name)) like '%' || v_text || '%'
           or exists (select 1 from public.product_hashtags ph join public.hashtags h on h.id = ph.hashtag_id
                      where ph.product_id = p.id and v_tag is not null and h.tag like v_tag || '%'))
      and (p_min_price is null or coalesce(p.promo_price, p.price) >= p_min_price)
      and (p_max_price is null or coalesce(p.promo_price, p.price) <= p_max_price)
      and (p_category is null or c.slug = p_category or sc.slug = p_category)
  )
  select s.id, s.name, s.slug, s.logo_url, s.cover_url, s.city, s.state, s.rating, s.free_shipping_min, s.fast_delivery,
    count(pr.id)::int,
    min(pr.eff_price),
    (select pi.url from public.product_images pi join prods p2 on p2.id = pi.product_id where p2.store_id = s.id order by pi.position limit 1),
    exists (select 1 from public.lives l where l.store_id = s.id and l.status = 'live'),
    (select l.id from public.lives l where l.store_id = s.id and l.status = 'live' limit 1),
    (select min(l.scheduled_at) from public.lives l where l.store_id = s.id and l.status = 'scheduled' and l.scheduled_at > now())
  from public.stores s
  join prods pr on pr.store_id = s.id
  where (not p_free_shipping or s.free_shipping_min is not null)
    and (not p_fast or s.fast_delivery)
    and (p_state is null or s.state = upper(p_state))
    and (p_city is null or lower(extensions.unaccent(s.city)) = lower(extensions.unaccent(p_city)))
    and (p_min_rating is null or s.rating >= p_min_rating)
  group by s.id
  order by count(pr.id) desc, s.rating desc
  limit p_limit;
end $$;

-- ---------------------------------------------------------------------
-- Hashtags em alta (só de produtos e lives públicos)
-- ---------------------------------------------------------------------
create or replace function public.trending_hashtags(p_limit int default 14)
returns table (tag text, uses int, live_now int)
language sql stable security definer set search_path = public as $$
  with uses as (
    select h.tag, ph.product_id as ref, null::uuid as live_id
    from public.product_hashtags ph join public.hashtags h on h.id = ph.hashtag_id
    where public.product_is_public(ph.product_id)
    union all
    select h.tag, lh.live_id, lh.live_id
    from public.live_hashtags lh join public.hashtags h on h.id = lh.hashtag_id
    join public.lives l on l.id = lh.live_id
    where public.store_is_public(l.store_id) and l.status <> 'ended'
  ),
  featured as (select unnest(featured_hashtags) as tag from public.platform_settings where id = 1)
  select u.tag,
         count(*)::int as uses,
         count(distinct u.live_id) filter (where exists (select 1 from public.lives l where l.id = u.live_id and l.status = 'live'))::int as live_now
  from uses u
  group by u.tag
  order by (u.tag in (select tag from featured)) desc, live_now desc, uses desc
  limit p_limit;
$$;

-- ---------------------------------------------------------------------
-- Ações de live (vendedor)
-- ---------------------------------------------------------------------
create or replace function public.start_live(p_live uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_store uuid;
begin
  select store_id into v_store from public.lives where id = p_live;
  if not public.owns_store(v_store) then raise exception 'Sem permissão'; end if;
  if not exists (select 1 from public.stores where id = v_store and status = 'approved') then
    raise exception 'Sua loja precisa ser aprovada antes de entrar ao vivo';
  end if;
  update public.lives set status = 'ended', ended_at = now() where store_id = v_store and status = 'live' and id <> p_live;
  update public.lives set status = 'live', started_at = now(), ended_at = null, viewers_count = 0 where id = p_live;
end $$;

create or replace function public.end_live(p_live uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_store uuid;
begin
  select store_id into v_store from public.lives where id = p_live;
  if not (public.owns_store(v_store) or public.is_admin()) then raise exception 'Sem permissão'; end if;
  update public.lives set status = 'ended', ended_at = now(), peak_viewers = greatest(peak_viewers, viewers_count) where id = p_live;
end $$;

-- Espectador entrou/saiu (contagem simples; vira presença em tempo real na fase 2)
create or replace function public.live_presence(p_live uuid, p_delta int)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  update public.lives
     set viewers_count = greatest(viewers_count + sign(p_delta)::int, 0),
         peak_viewers = greatest(peak_viewers, viewers_count + sign(p_delta)::int)
   where id = p_live and status = 'live'
  returning viewers_count into v;
  return coalesce(v, 0);
end $$;

-- ---------------------------------------------------------------------
-- Visão geral do admin
-- ---------------------------------------------------------------------
create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  return jsonb_build_object(
    'stores_total', (select count(*) from public.stores),
    'stores_pending', (select count(*) from public.stores where status = 'pending'),
    'stores_approved', (select count(*) from public.stores where status = 'approved'),
    'buyers', (select count(*) from public.profiles),
    'products', (select count(*) from public.products where active),
    'lives_now', (select count(*) from public.lives where status = 'live'),
    'lives_scheduled', (select count(*) from public.lives where status = 'scheduled' and scheduled_at > now()),
    'viewers_now', (select coalesce(sum(viewers_count), 0) from public.lives where status = 'live')
  );
end $$;

grant execute on function public.search_lives, public.search_stores, public.trending_hashtags, public.store_follower_count, public.live_presence to anon, authenticated;

-- Tempo real: a página da live acompanha produto fixado e encerramento
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.lives;
  end if;
end $$;
