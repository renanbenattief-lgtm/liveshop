-- =====================================================================
-- LIVESHOP · Fase 1 · Estrutura do banco
-- Marketplace onde todas as vendas acontecem por live.
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------
-- Configurações da plataforma (linha única)
-- ---------------------------------------------------------------------
create table public.platform_settings (
  id int primary key default 1 check (id = 1),
  commission_percent numeric(5,2) not null default 10 check (commission_percent between 0 and 100),
  featured_hashtags text[] not null default '{}',
  admin_emails text[] not null default '{}',
  updated_at timestamptz not null default now()
);
-- E-mails listados aqui viram admin ao criar a conta
insert into public.platform_settings (id, admin_emails) values (1, array['renanbenattief@gmail.com']);

-- ---------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  role text not null default 'buyer' check (role in ('buyer','seller','admin')),
  state text,
  city text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_admin boolean;
begin
  select lower(new.email) = any (select lower(unnest(admin_emails)) from public.platform_settings where id = 1)
    into v_admin;
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case when coalesce(v_admin, false) then 'admin' else 'buyer' end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impede que o próprio usuário promova a si mesmo
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    -- vendedor é definido pelo sistema ao abrir loja; admin só por outro admin
    if not (old.role = 'buyer' and new.role = 'seller' and exists (select 1 from public.stores where owner_id = new.id)) then
      new.role := old.role;
    end if;
  end if;
  return new;
end $$;

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'Casa',
  recipient text,
  cep text not null,
  street text not null,
  number text not null,
  complement text,
  district text,
  city text not null,
  state text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Categorias (is_adult reservado para a futura área +18 separada)
-- ---------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text not null default 'tag',
  is_adult boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Lojas
-- ---------------------------------------------------------------------
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  slug text not null unique,
  logo_url text,
  cover_url text,
  description text,
  document text,
  document_type text check (document_type in ('cpf','cnpj')),
  phone text,
  cep text,
  city text not null,
  state text not null check (char_length(state) = 2),
  category_id uuid references public.categories(id),
  status text not null default 'pending' check (status in ('pending','approved','suspended','rejected')),
  status_reason text,
  rating numeric(2,1) not null default 0,
  rating_count int not null default 0,
  free_shipping_min numeric(10,2),          -- null = sem frete grátis; 0 = frete grátis em tudo
  shipping_days int not null default 3 check (shipping_days >= 0),
  fast_delivery boolean not null default false,  -- envio em até 48h
  regions text[] not null default '{}',     -- UFs atendidas; vazio = Brasil todo
  created_at timestamptz not null default now()
);
create unique index stores_one_per_owner on public.stores(owner_id) where owner_id is not null;
create index stores_status_idx on public.stores(status);
create index stores_state_city_idx on public.stores(state, city);

create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Ao criar loja, o dono vira vendedor
create or replace function public.store_owner_becomes_seller()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.owner_id is not null then
    update public.profiles set role = 'seller' where id = new.owner_id and role = 'buyer';
  end if;
  return new;
end $$;
create trigger stores_owner_seller after insert on public.stores
  for each row execute function public.store_owner_becomes_seller();

-- Lojista não pode aprovar a própria loja nem mexer na nota
create or replace function public.protect_store_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pending';
      new.rating := 0;
      new.rating_count := 0;
    else
      new.status := old.status;
      new.status_reason := old.status_reason;
      new.rating := old.rating;
      new.rating_count := old.rating_count;
      new.owner_id := old.owner_id;
    end if;
  end if;
  return new;
end $$;
create trigger stores_protect before insert or update on public.stores
  for each row execute function public.protect_store_fields();

create or replace function public.owns_store(p_store uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.stores where id = p_store and owner_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Produtos
-- ---------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid references public.categories(id),
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  promo_price numeric(10,2) check (promo_price is null or promo_price >= 0),
  stock int not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index products_store_idx on public.products(store_id);
create index products_name_trgm on public.products using gin (name extensions.gin_trgm_ops);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  position int not null default 0
);
create index product_images_product_idx on public.product_images(product_id, position);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,      -- ex: Tamanho
  value text not null,     -- ex: M
  stock int not null default 0 check (stock >= 0)
);
create index product_variants_product_idx on public.product_variants(product_id);

-- ---------------------------------------------------------------------
-- Hashtags
-- ---------------------------------------------------------------------
create table public.hashtags (
  id uuid primary key default gen_random_uuid(),
  tag text not null unique check (tag ~ '^[a-z0-9_]{2,40}$'),
  use_count int not null default 0
);

create table public.product_hashtags (
  product_id uuid not null references public.products(id) on delete cascade,
  hashtag_id uuid not null references public.hashtags(id) on delete cascade,
  primary key (product_id, hashtag_id)
);
create index product_hashtags_tag_idx on public.product_hashtags(hashtag_id);

-- ---------------------------------------------------------------------
-- Lives
-- ---------------------------------------------------------------------
create table public.lives (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null,
  cover_url text,
  status text not null default 'scheduled' check (status in ('scheduled','live','ended')),
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  viewers_count int not null default 0,
  peak_viewers int not null default 0,
  featured_product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now()
);
create index lives_status_idx on public.lives(status);
create index lives_store_idx on public.lives(store_id);
-- Uma loja só pode ter uma live ao vivo por vez
create unique index lives_one_live_per_store on public.lives(store_id) where status = 'live';

create table public.live_products (
  live_id uuid not null references public.lives(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  position int not null default 0,
  primary key (live_id, product_id)
);
create index live_products_product_idx on public.live_products(product_id);

create table public.live_hashtags (
  live_id uuid not null references public.lives(id) on delete cascade,
  hashtag_id uuid not null references public.hashtags(id) on delete cascade,
  primary key (live_id, hashtag_id)
);
create index live_hashtags_tag_idx on public.live_hashtags(hashtag_id);

-- ---------------------------------------------------------------------
-- Seguir lojas e lembretes de live
-- ---------------------------------------------------------------------
create table public.store_followers (
  user_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, store_id)
);

create table public.live_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  live_id uuid references public.lives(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index live_reminders_unique on public.live_reminders(user_id, store_id, coalesce(live_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ---------------------------------------------------------------------
-- Contagem de uso das hashtags
-- ---------------------------------------------------------------------
create or replace function public.bump_hashtag_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.hashtags set use_count = use_count + 1 where id = new.hashtag_id;
  elsif tg_op = 'DELETE' then
    update public.hashtags set use_count = greatest(use_count - 1, 0) where id = old.hashtag_id;
  end if;
  return null;
end $$;
create trigger product_hashtags_count after insert or delete on public.product_hashtags
  for each row execute function public.bump_hashtag_count();
create trigger live_hashtags_count after insert or delete on public.live_hashtags
  for each row execute function public.bump_hashtag_count();

-- Normaliza "#Blusa de Frio" -> "blusadefrio"
create or replace function public.normalize_tag(p text)
returns text language sql immutable set search_path = '' as $$
  select left(regexp_replace(lower(extensions.unaccent(coalesce(p, ''))), '[^a-z0-9_]', '', 'g'), 40);
$$;

-- Define as hashtags de um produto (só o dono da loja ou admin)
create or replace function public.set_product_tags(p_product uuid, p_tags text[])
returns void language plpgsql security definer set search_path = public as $$
declare
  v_store uuid;
  v_tag text;
  v_id uuid;
begin
  select store_id into v_store from public.products where id = p_product;
  if v_store is null then raise exception 'Produto não encontrado'; end if;
  if not (public.owns_store(v_store) or public.is_admin()) then raise exception 'Sem permissão'; end if;

  delete from public.product_hashtags where product_id = p_product;
  foreach v_tag in array coalesce(p_tags, '{}') loop
    v_tag := public.normalize_tag(v_tag);
    continue when char_length(v_tag) < 2;
    insert into public.hashtags (tag) values (v_tag) on conflict (tag) do update set tag = excluded.tag returning id into v_id;
    insert into public.product_hashtags (product_id, hashtag_id) values (p_product, v_id) on conflict do nothing;
  end loop;
end $$;

-- Define as hashtags de uma live
create or replace function public.set_live_tags(p_live uuid, p_tags text[])
returns void language plpgsql security definer set search_path = public as $$
declare
  v_store uuid;
  v_tag text;
  v_id uuid;
begin
  select store_id into v_store from public.lives where id = p_live;
  if v_store is null then raise exception 'Live não encontrada'; end if;
  if not (public.owns_store(v_store) or public.is_admin()) then raise exception 'Sem permissão'; end if;

  delete from public.live_hashtags where live_id = p_live;
  foreach v_tag in array coalesce(p_tags, '{}') loop
    v_tag := public.normalize_tag(v_tag);
    continue when char_length(v_tag) < 2;
    insert into public.hashtags (tag) values (v_tag) on conflict (tag) do update set tag = excluded.tag returning id into v_id;
    insert into public.live_hashtags (live_id, hashtag_id) values (p_live, v_id) on conflict do nothing;
  end loop;
end $$;
