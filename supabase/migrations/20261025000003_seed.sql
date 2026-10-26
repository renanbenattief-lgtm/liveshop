-- LIVESHOP · dados de exemplo (pode apagar quando lançar)
do $seed$
declare
  d jsonb := '{"cats":[["Moda","moda","shirt"],["Calçados","calcados","footprints"],["Beleza","beleza","sparkles"],["Eletrônicos","eletronicos","smartphone"],["Casa","casa","sofa"],["Infantil","infantil","baby"],["Esportes","esportes","dumbbell"],["Acessórios","acessorios","watch"],["Pet","pet","paw-print"],["Alimentos","alimentos","cookie"]],"stores":[["Inverno Urbano","inverno-urbano","moda","Curitiba","PR",4.8,1240,199,2,true,"Moletons, blusas de frio e jaquetas direto da fábrica em Curitiba. Live todo dia às 19h.",[["Blusa de frio tricô gola alta",129.9,99.9,40,"sweater",["blusadefrio","trico","inverno"],["P","M","G","GG"]],["Moletom canguru felpado",159.9,null,55,"hoodie",["moletom","blusadefrio","inverno"],["P","M","G"]],["Jaqueta puffer impermeável",289.9,239.9,18,"jacket",["jaqueta","inverno","puffer"],["M","G","GG"]],["Cachecol de lã",49.9,null,80,"scarf",["cachecol","inverno","acessorios"],[]],["Cardigan oversized",139.9,119.9,30,"cardigan",["cardigan","blusadefrio","trico"],["Único"]],["Calça moletom jogger",99.9,null,60,"sweatpants",["moletom","jogger"],["P","M","G"]]]],["Pé Direito Calçados","pe-direito","calcados","Franca","SP",4.6,860,299,3,false,"Calçados de couro feitos em Franca. Tênis, botas e sapatênis com preço de fábrica.",[["Tênis casual couro branco",249.9,199.9,35,"sneakers",["tenis","couro","casual"],["38","39","40","41","42"]],["Bota coturno feminina",279.9,null,22,"boots",["bota","coturno","inverno"],["34","35","36","37"]],["Sapatênis masculino",189.9,159.9,40,"shoes",["sapatenis","casual"],["39","40","41","42","43"]],["Chinelo slide",59.9,null,120,"slippers",["chinelo","verao"],["37/38","39/40","41/42"]],["Tênis de corrida leve",329.9,279.9,25,"running,shoes",["tenis","corrida","esporte"],["38","40","42"]]]],["Glow Make","glow-make","beleza","Belo Horizonte","MG",4.9,2310,0,1,true,"Maquiagem e skincare com teste ao vivo. Frete grátis para todo o Brasil.",[["Base líquida matte 30ml",69.9,54.9,90,"makeup",["maquiagem","base","make"],["Clara","Média","Escura"]],["Paleta de sombras 12 cores",89.9,null,50,"eyeshadow",["maquiagem","sombra","make"],[]],["Sérum vitamina C",79.9,64.9,70,"skincare",["skincare","vitaminac"],[]],["Kit pincéis 10 peças",59.9,null,45,"makeup,brush",["pincel","maquiagem"],[]],["Batom líquido longa duração",34.9,29.9,150,"lipstick",["batom","make"],["Nude","Vermelho","Vinho"]],["Protetor solar facial FPS 50",59.9,null,100,"sunscreen",["skincare","protetorsolar"],[]]]],["TecnoVila","tecnovila","eletronicos","São Paulo","SP",4.5,3120,149,1,true,"Fones, carregadores e gadgets com garantia. Envio no mesmo dia para SP capital.",[["Fone bluetooth com cancelamento de ruído",299.9,229.9,60,"headphones",["fone","bluetooth","eletronicos"],["Preto","Branco"]],["Carregador turbo 30W USB-C",79.9,59.9,200,"charger",["carregador","celular"],[]],["Smartwatch tela AMOLED",399.9,349.9,30,"smartwatch",["smartwatch","relogio","eletronicos"],["Preto","Rosa"]],["Caixa de som portátil à prova d''água",189.9,null,45,"speaker",["caixadesom","bluetooth"],[]],["Power bank 20.000 mAh",149.9,129.9,70,"powerbank",["powerbank","celular"],[]],["Ring light 26cm com tripé",119.9,null,40,"ringlight",["ringlight","live","criador"],[]]]],["Casa Brisa","casa-brisa","casa","Blumenau","SC",4.7,540,249,4,false,"Cama, mesa e banho de Blumenau. Mantas e edredons para o inverno.",[["Manta de microfibra casal",119.9,89.9,50,"blanket",["manta","inverno","casa"],["Cinza","Bege","Azul"]],["Jogo de cama 4 peças algodão",189.9,null,35,"bedding",["jogodecama","casa"],["Casal","Queen"]],["Kit 4 toalhas de banho",129.9,109.9,40,"towels",["toalha","banho"],[]],["Almofada decorativa veludo",49.9,null,90,"cushion",["almofada","decoracao"],[]],["Edredom dupla face",229.9,199.9,20,"duvet",["edredom","inverno"],["Casal","Queen","King"]]]],["Pequeno Mundo","pequeno-mundo","infantil","Salvador","BA",4.8,720,179,3,false,"Roupas e brinquedos infantis, do bebê aos 12 anos.",[["Conjunto moletom infantil",89.9,74.9,60,"kids,clothes",["infantil","moletom","blusadefrio"],["2","4","6","8","10"]],["Pijama infantil algodão",59.9,null,80,"pajamas",["pijama","infantil"],["2","4","6","8"]],["Blocos de montar 200 peças",99.9,84.9,40,"toys,blocks",["brinquedo","infantil"],[]],["Tênis infantil com luz",119.9,null,35,"kids,shoes",["tenis","infantil"],["24","26","28","30"]],["Mochila escolar",129.9,99.9,30,"backpack",["mochila","voltaasaulas"],[]]]],["Arena Fit","arena-fit","esportes","Rio de Janeiro","RJ",4.6,980,199,2,true,"Moda fitness e acessórios de treino. Live com a gente treinando e vendendo.",[["Legging cintura alta",89.9,69.9,100,"leggings",["legging","fitness","academia"],["P","M","G"]],["Top esportivo",59.9,null,90,"sportsbra",["top","fitness"],["P","M","G"]],["Garrafa térmica 1L",79.9,64.9,70,"bottle",["garrafa","academia"],[]],["Kit elásticos de resistência",69.9,null,60,"resistance,bands",["treinoemcasa","fitness"],[]],["Corta-vento esportivo",159.9,129.9,30,"windbreaker",["cortavento","corrida","blusadefrio"],["P","M","G","GG"]]]],["Brilho de Prata","brilho-de-prata","acessorios","Fortaleza","CE",4.9,1530,99,2,false,"Semijoias e prata 925 com garantia. Peças novas toda semana na live.",[["Colar ponto de luz prata 925",89.9,69.9,80,"necklace",["colar","prata","semijoias"],[]],["Brinco argola média",49.9,null,120,"earrings",["brinco","semijoias"],[]],["Anel solitário",79.9,59.9,60,"ring,jewelry",["anel","prata"],["14","16","18","20"]],["Pulseira riviera",99.9,null,40,"bracelet",["pulseira","semijoias"],[]],["Relógio feminino dourado",199.9,169.9,25,"watch",["relogio","acessorios"],[]]]]],"lives":[["inverno-urbano","Queima de estoque de blusas de frio","live",null,1834,"sweater,woman",["blusadefrio","inverno","promocao"],[0,1,4,3]],["glow-make","Testando bases em todos os tons","live",null,2610,"makeup,woman",["maquiagem","make","base"],[0,1,4,3]],["tecnovila","Fones com até 30% off ao vivo","live",null,942,"headphones,studio",["fone","eletronicos","promocao"],[0,1,4,3]],["arena-fit","Look de treino + corta-vento","live",null,615,"fitness,woman",["fitness","academia","blusadefrio"],[0,1,4]],["brilho-de-prata","Semijoias novas da semana","live",null,1207,"jewelry",["semijoias","prata"],[0,1,2,4]],["pequeno-mundo","Inverno kids: moletons a partir de R$74","live",null,388,"kids,winter",["infantil","blusadefrio"],[0,1,3]],["casa-brisa","Mantas e edredons para o frio","scheduled",90,0,"blanket,bedroom",["inverno","casa","manta"],[0,4,1]],["pe-direito","Botas e coturnos para o inverno","scheduled",180,0,"boots,leather",["bota","inverno"],[1,0,2]],["inverno-urbano","Lançamento coleção jaquetas","scheduled",1440,0,"jacket,fashion",["jaqueta","inverno"],[2,4]],["tecnovila","Setup de live: ring light e acessórios","scheduled",300,0,"ringlight",["ringlight","criador"],[5,1,4]]]}';
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
