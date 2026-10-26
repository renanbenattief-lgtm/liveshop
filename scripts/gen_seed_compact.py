"""Versão compacta do seed (JSON + bloco plpgsql) para aplicar pelo Supabase."""
import json, importlib.util, pathlib
spec = importlib.util.spec_from_file_location("g", pathlib.Path(__file__).parent / "gen_seed.py")
g = importlib.util.module_from_spec(spec); spec.loader.exec_module(g)

data = {
  "cats": [[n, s, i] for n, s, i in g.categories],
  "stores": [[n, s, c, ci, uf, r, rc, fsm, d, f, desc, [[pn, pr, pp, st, kw, tg, vs] for pn, pr, pp, st, kw, tg, vs in prods]]
             for (n, s, c, ci, uf, r, rc, fsm, d, f, desc, prods) in g.stores],
  "lives": [list(l) for l in g.lives],
}
js = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("'", "''")
sql = f"""do $seed$
declare
  d jsonb := '{js}';
  c jsonb; s jsonb; p jsonb; l jsonb; sj jsonb; v text; t text;
  v_cat uuid; v_store uuid; v_prod uuid; v_live uuid; i int; k int; si int := 0; li int := 0;
begin
  i := 0;
  for c in select * from jsonb_array_elements(d->'cats') loop
    insert into public.categories (name, slug, icon, sort_order) values (c->>0, c->>1, c->>2, i); i := i + 1;
  end loop;
  insert into public.categories (name, slug, icon, is_adult, sort_order) values ('Adulto (+18)', 'adulto', 'lock', true, 99);

  alter table public.stores disable trigger stores_protect;
  for s in select * from jsonb_array_elements(d->'stores') loop
    select id into v_cat from public.categories where slug = s->>2;
    insert into public.stores (name, slug, cover_url, description, document_type, city, state, category_id, status, rating, rating_count, free_shipping_min, shipping_days, fast_delivery)
    values (s->>0, s->>1, 'https://loremflickr.com/1200/500/' || (s->11->0->>4) || '?lock=' || (900 + si), s->>10, 'cnpj', s->>3, s->>4, v_cat, 'approved',
            (s->>5)::numeric, (s->>6)::int, (s->>7)::numeric, (s->>8)::int, (s->>9)::boolean)
    returning id into v_store;
    i := 0;
    for p in select * from jsonb_array_elements(s->11) loop
      insert into public.products (store_id, category_id, name, description, price, promo_price, stock)
      values (v_store, v_cat, p->>0, (p->>0) || ' — ' || split_part(s->>10, '.', 1) || '.', (p->>1)::numeric, nullif(p->>2, '')::numeric, (p->>3)::int)
      returning id into v_prod;
      for k in 0..2 loop
        insert into public.product_images (product_id, url, position) values (v_prod, 'https://loremflickr.com/600/800/' || (p->>4) || '?lock=' || (si * 100 + i * 10 + k), k);
      end loop;
      for v in select * from jsonb_array_elements_text(p->6) loop
        insert into public.product_variants (product_id, name, value, stock)
        values (v_prod, case when v ~ '^[0-9]' or v in ('P','M','G','GG','Único','Casal','Queen','King') then 'Tamanho' else 'Opção' end, v,
                greatest((p->>3)::int / greatest(jsonb_array_length(p->6), 1), 1));
      end loop;
      for t in select * from jsonb_array_elements_text(p->5) loop
        insert into public.hashtags (tag) values (t) on conflict (tag) do nothing;
        insert into public.product_hashtags (product_id, hashtag_id) select v_prod, id from public.hashtags where tag = t;
      end loop;
      i := i + 1;
    end loop;
    si := si + 1;
  end loop;
  alter table public.stores enable trigger stores_protect;

  for l in select * from jsonb_array_elements(d->'lives') loop
    select id into v_store from public.stores where slug = l->>0;
    select x into sj from jsonb_array_elements(d->'stores') x where x->>1 = l->>0;
    insert into public.lives (store_id, title, cover_url, status, scheduled_at, started_at, viewers_count, peak_viewers)
    values (v_store, l->>1, 'https://loremflickr.com/540/960/' || (l->>5) || '?lock=' || (500 + li), l->>2,
            case when l->>3 is null then null else now() + ((l->>3) || ' minutes')::interval end,
            case when l->>2 = 'live' then now() - ((10 + li * 7) || ' minutes')::interval end,
            (l->>4)::int, (l->>4)::int)
    returning id into v_live;
    i := 0;
    for k in select (x)::int from jsonb_array_elements_text(l->7) x loop
      select id into v_prod from public.products where store_id = v_store and name = sj->11->k->>0;
      insert into public.live_products (live_id, product_id, position) values (v_live, v_prod, i) on conflict do nothing;
      if i = 0 then update public.lives set featured_product_id = v_prod where id = v_live; end if;
      i := i + 1;
    end loop;
    for t in select * from jsonb_array_elements_text(l->6) loop
      insert into public.hashtags (tag) values (t) on conflict (tag) do nothing;
      insert into public.live_hashtags (live_id, hashtag_id) select v_live, id from public.hashtags where tag = t;
    end loop;
    li := li + 1;
  end loop;

  update public.platform_settings set featured_hashtags = array['blusadefrio','inverno','maquiagem','tenis'] where id = 1;
end $seed$;
"""
out = pathlib.Path(__file__).resolve().parent.parent / "supabase/migrations/20261025000003_seed.sql"
out.write_text("-- LIVESHOP · dados de exemplo (pode apagar quando lançar)\n" + sql)
print(len(sql))
