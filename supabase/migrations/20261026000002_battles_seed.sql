-- Batalhas de exemplo (pode apagar antes de lançar)
do $seed$
declare
  v_iu uuid; v_af uuid; v_pm uuid; p_iu uuid; p_af uuid; p_pm uuid; p_iu2 uuid; v_b uuid; v_cat uuid;
begin
  select id into v_iu from public.stores where slug = 'inverno-urbano';
  select id into v_af from public.stores where slug = 'arena-fit';
  select id into v_pm from public.stores where slug = 'pequeno-mundo';
  if v_iu is null or v_af is null or v_pm is null then return; end if;

  -- Produto igual nas duas lojas: moletom canguru a R$ 159,90
  select id into p_iu from public.products where store_id = v_iu and name = 'Moletom canguru felpado';
  select category_id into v_cat from public.stores where id = v_af;
  insert into public.products (store_id, category_id, name, description, price, stock)
  values (v_af, v_cat, 'Moletom canguru felpado', 'Moletom canguru felpado unissex, o mesmo modelo da Inverno Urbano.', 159.90, 40)
  returning id into p_af;
  insert into public.product_images (product_id, url, position)
  values (p_af, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=800&fit=crop&auto=format&q=70', 0);
  insert into public.product_hashtags (product_id, hashtag_id) select p_af, id from public.hashtags where tag in ('moletom', 'blusadefrio', 'inverno');

  insert into public.battles (title, status, host_store_id, unit_price, unit_cost, commission_percent, goal_units, goal_reward, terms_version, scheduled_at, cover_url)
  values ('Batalha do moletom: Curitiba x Rio', 'scheduled', v_iu, 159.90, 70, 10, 60, 'Frete grátis para todo mundo', 1, now() + interval '3 hours',
          'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=540&h=960&fit=crop&auto=format&q=70')
  returning id into v_b;
  insert into public.battle_participants (battle_id, store_id, role, product_id, stock_declared, declared_cost, terms_version, terms_accepted_at)
  values (v_b, v_iu, 'host', p_iu, 50, 70, 1, now()), (v_b, v_af, 'guest', p_af, 40, 70, 1, now());

  -- Batalha ao vivo: moletom infantil a R$ 74,90
  select id into p_pm from public.products where store_id = v_pm and name = 'Conjunto moletom infantil';
  select category_id into v_cat from public.stores where id = v_iu;
  insert into public.products (store_id, category_id, name, description, price, promo_price, stock)
  values (v_iu, v_cat, 'Conjunto moletom infantil', 'Conjunto infantil felpado, o mesmo da Pequeno Mundo.', 89.90, 74.90, 60)
  returning id into p_iu2;
  insert into public.product_images (product_id, url, position)
  values (p_iu2, 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=600&h=800&fit=crop&auto=format&q=70', 0);
  insert into public.product_hashtags (product_id, hashtag_id) select p_iu2, id from public.hashtags where tag in ('infantil', 'moletom', 'blusadefrio');

  insert into public.battles (title, status, host_store_id, unit_price, unit_cost, commission_percent, goal_units, goal_reward, terms_version, scheduled_at, started_at, cover_url)
  values ('Inverno kids: Salvador x Curitiba', 'live', v_pm, 74.90, 32, 10, 80, 'Cupom de 10% na próxima compra', 1, now() - interval '20 minutes', now() - interval '15 minutes',
          'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=540&h=960&fit=crop&auto=format&q=70')
  returning id into v_b;
  insert into public.battle_participants (battle_id, store_id, role, product_id, stock_declared, declared_cost, terms_version, terms_accepted_at, units_sold, shipping_paid)
  values (v_b, v_pm, 'host', p_pm, 60, 32, 1, now(), 34, 0), (v_b, v_iu, 'guest', p_iu2, 60, 32, 1, now(), 21, 0);
end $seed$;
