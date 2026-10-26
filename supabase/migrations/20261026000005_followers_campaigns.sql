-- =====================================================================
-- LIVESHOP · Avisos para seguidores + Campanhas temáticas por data
-- =====================================================================

-- ---------------------------------------------------------------------
-- Avisos (notificações dentro do app)
-- ---------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('live_started', 'battle_live', 'campaign_started', 'new_follower')),
  title text not null,
  body text,
  link text,
  image_url text,
  store_id uuid references public.stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
create index notifications_unread_idx on public.notifications(user_id) where read_at is null;

alter table public.notifications enable row level security;
create policy "notifications_own_read" on public.notifications for select using (user_id = auth.uid());
create policy "notifications_own_update" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_own_delete" on public.notifications for delete using (user_id = auth.uid());
-- criação só pelos gatilhos abaixo

create or replace function public.mark_notifications_read()
returns void language sql security definer set search_path = public as $$
  update public.notifications set read_at = now() where user_id = auth.uid() and read_at is null;
$$;

-- Loja entrou ao vivo: avisa seguidores e quem pediu lembrete
create or replace function public.notify_live_started()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_store public.stores;
begin
  if new.status = 'live' and old.status is distinct from 'live' then
    select * into v_store from public.stores where id = new.store_id;
    insert into public.notifications (user_id, type, title, body, link, image_url, store_id)
    select distinct u.user_id, 'live_started', v_store.name || ' está ao vivo', new.title, '/live/' || new.id,
           coalesce(new.cover_url, v_store.logo_url), v_store.id
    from (
      select user_id from public.store_followers where store_id = new.store_id
      union
      select user_id from public.live_reminders where store_id = new.store_id and (live_id is null or live_id = new.id)
    ) u
    where u.user_id is distinct from v_store.owner_id;
    -- lembrete de uma live específica é usado uma vez
    delete from public.live_reminders where live_id = new.id;
  end if;
  return null;
end $$;
create trigger lives_notify_started after update of status on public.lives
  for each row execute function public.notify_live_started();

-- Batalha entrou ao vivo: avisa seguidores das lojas participantes
create or replace function public.notify_battle_live()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_names text;
begin
  if new.status = 'live' and old.status is distinct from 'live' then
    select string_agg(s.name, ' x ' order by bp.role desc) into v_names
      from public.battle_participants bp join public.stores s on s.id = bp.store_id where bp.battle_id = new.id;
    insert into public.notifications (user_id, type, title, body, link, image_url)
    select distinct f.user_id, 'battle_live', 'Batalha do Bem ao vivo: ' || v_names, new.title, '/batalha/' || new.id, new.cover_url
    from public.store_followers f
    where f.store_id in (select store_id from public.battle_participants where battle_id = new.id);
  end if;
  return null;
end $$;
create trigger battles_notify_live after update of status on public.battles
  for each row execute function public.notify_battle_live();

-- Novo seguidor: avisa o dono da loja
create or replace function public.notify_new_follower()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_name text;
begin
  select owner_id into v_owner from public.stores where id = new.store_id;
  if v_owner is null or v_owner = new.user_id then return null; end if;
  select coalesce(split_part(full_name, ' ', 1), 'Alguém') into v_name from public.profiles where id = new.user_id;
  insert into public.notifications (user_id, type, title, link, store_id)
  values (v_owner, 'new_follower', v_name || ' começou a seguir sua loja', '/vendedor', new.store_id);
  return null;
end $$;
create trigger store_followers_notify after insert on public.store_followers
  for each row execute function public.notify_new_follower();

-- Estatística de seguidores para o painel do vendedor
create or replace function public.store_follower_stats(p_store uuid)
returns table (total int, last_7_days int, last_30_days int)
language sql stable security definer set search_path = public as $$
  select count(*)::int,
         count(*) filter (where created_at > now() - interval '7 days')::int,
         count(*) filter (where created_at > now() - interval '30 days')::int
  from public.store_followers where store_id = p_store and (public.owns_store(p_store) or public.is_admin());
$$;

-- ---------------------------------------------------------------------
-- Campanhas temáticas (Black Friday, Natal, Dia das Mães...)
-- ---------------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  tagline text,                                   -- frase curta do banner
  description text,
  hashtag text not null check (hashtag ~ '^[a-z0-9_]{2,40}$'),
  color text not null default '#FFD23F' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  banner_url text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  min_discount_percent int check (min_discount_percent is null or min_discount_percent between 1 and 90),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index campaigns_dates_idx on public.campaigns(starts_at, ends_at);

create table public.campaign_stores (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (campaign_id, store_id)
);
create index campaign_stores_store_idx on public.campaign_stores(store_id);

alter table public.lives add column campaign_id uuid references public.campaigns(id) on delete set null;
create index lives_campaign_idx on public.lives(campaign_id) where campaign_id is not null;

alter table public.campaigns enable row level security;
alter table public.campaign_stores enable row level security;

create policy "campaigns_read" on public.campaigns for select using (active or public.is_admin());
create policy "campaigns_admin_write" on public.campaigns for all using (public.is_admin()) with check (public.is_admin());

create policy "campaign_stores_read" on public.campaign_stores for select using (true);
create policy "campaign_stores_join" on public.campaign_stores for insert with check (
  public.owns_store(store_id)
  and public.store_cnpj_ok(store_id)
  and exists (select 1 from public.campaigns c where c.id = campaign_id and c.active and c.ends_at > now())
);
create policy "campaign_stores_leave" on public.campaign_stores for delete using (public.owns_store(store_id) or public.is_admin());

-- Live marcada numa campanha: a loja precisa ter entrado nela, a data precisa
-- estar dentro do período e a hashtag da campanha entra na live automaticamente
create or replace function public.live_campaign_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare c public.campaigns; v_when timestamptz;
begin
  if new.campaign_id is null then return new; end if;
  if tg_op = 'UPDATE' and new.campaign_id is not distinct from old.campaign_id then return new; end if;
  select * into c from public.campaigns where id = new.campaign_id and active;
  if c.id is null then raise exception 'Campanha indisponível'; end if;
  if not exists (select 1 from public.campaign_stores where campaign_id = c.id and store_id = new.store_id) then
    raise exception 'Entre na campanha "%" antes de marcar lives nela', c.name;
  end if;
  v_when := coalesce(new.scheduled_at, now());
  if v_when < c.starts_at or v_when > c.ends_at then
    raise exception 'A live precisa acontecer durante a campanha (% a %)', to_char(c.starts_at at time zone 'America/Sao_Paulo', 'DD/MM'), to_char(c.ends_at at time zone 'America/Sao_Paulo', 'DD/MM');
  end if;
  return new;
end $$;
create trigger lives_campaign_guard before insert or update of campaign_id on public.lives
  for each row execute function public.live_campaign_guard();

create or replace function public.live_campaign_tag()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_tag text; v_id uuid;
begin
  if new.campaign_id is null then return null; end if;
  select hashtag into v_tag from public.campaigns where id = new.campaign_id;
  insert into public.hashtags (tag) values (v_tag) on conflict (tag) do update set tag = excluded.tag returning id into v_id;
  insert into public.live_hashtags (live_id, hashtag_id) values (new.id, v_id) on conflict do nothing;
  return null;
end $$;
create trigger lives_campaign_tag after insert or update of campaign_id on public.lives
  for each row execute function public.live_campaign_tag();

-- set_live_tags apaga e recria as hashtags da live: mantém a da campanha
create or replace function public.set_live_tags(p_live uuid, p_tags text[])
returns void language plpgsql security definer set search_path = public as $$
declare
  v_store uuid; v_campaign uuid; v_tag text; v_id uuid;
begin
  select store_id, campaign_id into v_store, v_campaign from public.lives where id = p_live;
  if v_store is null then raise exception 'Live não encontrada'; end if;
  if not (public.owns_store(v_store) or public.is_admin()) then raise exception 'Sem permissão'; end if;

  delete from public.live_hashtags where live_id = p_live;
  if v_campaign is not null then
    p_tags := coalesce(p_tags, '{}') || (select hashtag from public.campaigns where id = v_campaign);
  end if;
  foreach v_tag in array coalesce(p_tags, '{}') loop
    v_tag := public.normalize_tag(v_tag);
    continue when char_length(v_tag) < 2;
    insert into public.hashtags (tag) values (v_tag) on conflict (tag) do update set tag = excluded.tag returning id into v_id;
    insert into public.live_hashtags (live_id, hashtag_id) values (p_live, v_id) on conflict do nothing;
  end loop;
end $$;

-- Campanhas para a home e para o painel (ativas e próximas)
create or replace function public.current_campaigns(p_limit int default 6)
returns table (id uuid, name text, slug text, tagline text, description text, hashtag text, color text, banner_url text,
               starts_at timestamptz, ends_at timestamptz, min_discount_percent int, is_running boolean,
               stores_count int, lives_now int)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.slug, c.tagline, c.description, c.hashtag, c.color, c.banner_url, c.starts_at, c.ends_at, c.min_discount_percent,
         now() between c.starts_at and c.ends_at,
         (select count(*)::int from public.campaign_stores cs where cs.campaign_id = c.id and public.store_is_public(cs.store_id)),
         (select count(*)::int from public.lives l where l.campaign_id = c.id and l.status = 'live' and public.store_is_public(l.store_id))
  from public.campaigns c
  where c.active and c.ends_at > now()
  order by (now() between c.starts_at and c.ends_at) desc, c.starts_at
  limit p_limit;
$$;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

revoke execute on function public.notify_live_started(), public.notify_battle_live(), public.notify_new_follower(),
  public.live_campaign_guard(), public.live_campaign_tag() from public, anon, authenticated;
revoke execute on function public.mark_notifications_read(), public.store_follower_stats(uuid) from public, anon;
grant execute on function public.mark_notifications_read(), public.store_follower_stats(uuid) to authenticated;
grant execute on function public.current_campaigns(int) to anon, authenticated;
