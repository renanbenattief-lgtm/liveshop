"""Gera supabase/migrations/..._seed.sql com dados de exemplo do LIVESHOP."""
import uuid, json, pathlib

NS = uuid.UUID("6b1f3a2e-0000-4000-8000-000000000000")
def uid(*k): return str(uuid.uuid5(NS, "/".join(k)))
def q(s): return "null" if s is None else "'" + str(s).replace("'", "''") + "'"
def img(kw, lock, w=600, h=800): return f"https://loremflickr.com/{w}/{h}/{kw}?lock={lock}"

categories = [
    ("Moda", "moda", "shirt"), ("Calçados", "calcados", "footprints"), ("Beleza", "beleza", "sparkles"),
    ("Eletrônicos", "eletronicos", "smartphone"), ("Casa", "casa", "sofa"), ("Infantil", "infantil", "baby"),
    ("Esportes", "esportes", "dumbbell"), ("Acessórios", "acessorios", "watch"), ("Pet", "pet", "paw-print"),
    ("Alimentos", "alimentos", "cookie"),
]
ADULT = ("Adulto (+18)", "adulto", "lock")

# (nome, slug, categoria, cidade, UF, nota, avaliações, frete_gratis_min, prazo, rapido, descrição, produtos)
# produto: (nome, preço, promo, estoque, palavra-chave da foto, [hashtags], [variações])
stores = [
    ("Inverno Urbano", "inverno-urbano", "moda", "Curitiba", "PR", 4.8, 1240, 199, 2, True,
     "Moletons, blusas de frio e jaquetas direto da fábrica em Curitiba. Live todo dia às 19h.",
     [("Blusa de frio tricô gola alta", 129.9, 99.9, 40, "sweater", ["blusadefrio", "trico", "inverno"], ["P", "M", "G", "GG"]),
      ("Moletom canguru felpado", 159.9, None, 55, "hoodie", ["moletom", "blusadefrio", "inverno"], ["P", "M", "G"]),
      ("Jaqueta puffer impermeável", 289.9, 239.9, 18, "jacket", ["jaqueta", "inverno", "puffer"], ["M", "G", "GG"]),
      ("Cachecol de lã", 49.9, None, 80, "scarf", ["cachecol", "inverno", "acessorios"], []),
      ("Cardigan oversized", 139.9, 119.9, 30, "cardigan", ["cardigan", "blusadefrio", "trico"], ["Único"]),
      ("Calça moletom jogger", 99.9, None, 60, "sweatpants", ["moletom", "jogger"], ["P", "M", "G"])]),
    ("Pé Direito Calçados", "pe-direito", "calcados", "Franca", "SP", 4.6, 860, 299, 3, False,
     "Calçados de couro feitos em Franca. Tênis, botas e sapatênis com preço de fábrica.",
     [("Tênis casual couro branco", 249.9, 199.9, 35, "sneakers", ["tenis", "couro", "casual"], ["38", "39", "40", "41", "42"]),
      ("Bota coturno feminina", 279.9, None, 22, "boots", ["bota", "coturno", "inverno"], ["34", "35", "36", "37"]),
      ("Sapatênis masculino", 189.9, 159.9, 40, "shoes", ["sapatenis", "casual"], ["39", "40", "41", "42", "43"]),
      ("Chinelo slide", 59.9, None, 120, "slippers", ["chinelo", "verao"], ["37/38", "39/40", "41/42"]),
      ("Tênis de corrida leve", 329.9, 279.9, 25, "running,shoes", ["tenis", "corrida", "esporte"], ["38", "40", "42"])]),
    ("Glow Make", "glow-make", "beleza", "Belo Horizonte", "MG", 4.9, 2310, 0, 1, True,
     "Maquiagem e skincare com teste ao vivo. Frete grátis para todo o Brasil.",
     [("Base líquida matte 30ml", 69.9, 54.9, 90, "makeup", ["maquiagem", "base", "make"], ["Clara", "Média", "Escura"]),
      ("Paleta de sombras 12 cores", 89.9, None, 50, "eyeshadow", ["maquiagem", "sombra", "make"], []),
      ("Sérum vitamina C", 79.9, 64.9, 70, "skincare", ["skincare", "vitaminac"], []),
      ("Kit pincéis 10 peças", 59.9, None, 45, "makeup,brush", ["pincel", "maquiagem"], []),
      ("Batom líquido longa duração", 34.9, 29.9, 150, "lipstick", ["batom", "make"], ["Nude", "Vermelho", "Vinho"]),
      ("Protetor solar facial FPS 50", 59.9, None, 100, "sunscreen", ["skincare", "protetorsolar"], [])]),
    ("TecnoVila", "tecnovila", "eletronicos", "São Paulo", "SP", 4.5, 3120, 149, 1, True,
     "Fones, carregadores e gadgets com garantia. Envio no mesmo dia para SP capital.",
     [("Fone bluetooth com cancelamento de ruído", 299.9, 229.9, 60, "headphones", ["fone", "bluetooth", "eletronicos"], ["Preto", "Branco"]),
      ("Carregador turbo 30W USB-C", 79.9, 59.9, 200, "charger", ["carregador", "celular"], []),
      ("Smartwatch tela AMOLED", 399.9, 349.9, 30, "smartwatch", ["smartwatch", "relogio", "eletronicos"], ["Preto", "Rosa"]),
      ("Caixa de som portátil à prova d'água", 189.9, None, 45, "speaker", ["caixadesom", "bluetooth"], []),
      ("Power bank 20.000 mAh", 149.9, 129.9, 70, "powerbank", ["powerbank", "celular"], []),
      ("Ring light 26cm com tripé", 119.9, None, 40, "ringlight", ["ringlight", "live", "criador"], [])]),
    ("Casa Brisa", "casa-brisa", "casa", "Blumenau", "SC", 4.7, 540, 249, 4, False,
     "Cama, mesa e banho de Blumenau. Mantas e edredons para o inverno.",
     [("Manta de microfibra casal", 119.9, 89.9, 50, "blanket", ["manta", "inverno", "casa"], ["Cinza", "Bege", "Azul"]),
      ("Jogo de cama 4 peças algodão", 189.9, None, 35, "bedding", ["jogodecama", "casa"], ["Casal", "Queen"]),
      ("Kit 4 toalhas de banho", 129.9, 109.9, 40, "towels", ["toalha", "banho"], []),
      ("Almofada decorativa veludo", 49.9, None, 90, "cushion", ["almofada", "decoracao"], []),
      ("Edredom dupla face", 229.9, 199.9, 20, "duvet", ["edredom", "inverno"], ["Casal", "Queen", "King"])]),
    ("Pequeno Mundo", "pequeno-mundo", "infantil", "Salvador", "BA", 4.8, 720, 179, 3, False,
     "Roupas e brinquedos infantis, do bebê aos 12 anos.",
     [("Conjunto moletom infantil", 89.9, 74.9, 60, "kids,clothes", ["infantil", "moletom", "blusadefrio"], ["2", "4", "6", "8", "10"]),
      ("Pijama infantil algodão", 59.9, None, 80, "pajamas", ["pijama", "infantil"], ["2", "4", "6", "8"]),
      ("Blocos de montar 200 peças", 99.9, 84.9, 40, "toys,blocks", ["brinquedo", "infantil"], []),
      ("Tênis infantil com luz", 119.9, None, 35, "kids,shoes", ["tenis", "infantil"], ["24", "26", "28", "30"]),
      ("Mochila escolar", 129.9, 99.9, 30, "backpack", ["mochila", "voltaasaulas"], [])]),
    ("Arena Fit", "arena-fit", "esportes", "Rio de Janeiro", "RJ", 4.6, 980, 199, 2, True,
     "Moda fitness e acessórios de treino. Live com a gente treinando e vendendo.",
     [("Legging cintura alta", 89.9, 69.9, 100, "leggings", ["legging", "fitness", "academia"], ["P", "M", "G"]),
      ("Top esportivo", 59.9, None, 90, "sportsbra", ["top", "fitness"], ["P", "M", "G"]),
      ("Garrafa térmica 1L", 79.9, 64.9, 70, "bottle", ["garrafa", "academia"], []),
      ("Kit elásticos de resistência", 69.9, None, 60, "resistance,bands", ["treinoemcasa", "fitness"], []),
      ("Corta-vento esportivo", 159.9, 129.9, 30, "windbreaker", ["cortavento", "corrida", "blusadefrio"], ["P", "M", "G", "GG"])]),
    ("Brilho de Prata", "brilho-de-prata", "acessorios", "Fortaleza", "CE", 4.9, 1530, 99, 2, False,
     "Semijoias e prata 925 com garantia. Peças novas toda semana na live.",
     [("Colar ponto de luz prata 925", 89.9, 69.9, 80, "necklace", ["colar", "prata", "semijoias"], []),
      ("Brinco argola média", 49.9, None, 120, "earrings", ["brinco", "semijoias"], []),
      ("Anel solitário", 79.9, 59.9, 60, "ring,jewelry", ["anel", "prata"], ["14", "16", "18", "20"]),
      ("Pulseira riviera", 99.9, None, 40, "bracelet", ["pulseira", "semijoias"], []),
      ("Relógio feminino dourado", 199.9, 169.9, 25, "watch", ["relogio", "acessorios"], [])]),
]

# Lives: (slug da loja, título, status, minutos a partir de agora (agendadas), espectadores, palavra-chave capa, [hashtags], índices de produtos)
lives = [
    ("inverno-urbano", "Queima de estoque de blusas de frio", "live", None, 1834, "sweater,woman", ["blusadefrio", "inverno", "promocao"], [0, 1, 4, 3]),
    ("glow-make", "Testando bases em todos os tons", "live", None, 2610, "makeup,woman", ["maquiagem", "make", "base"], [0, 1, 4, 3]),
    ("tecnovila", "Fones com até 30% off ao vivo", "live", None, 942, "headphones,studio", ["fone", "eletronicos", "promocao"], [0, 1, 4, 3]),
    ("arena-fit", "Look de treino + corta-vento", "live", None, 615, "fitness,woman", ["fitness", "academia", "blusadefrio"], [0, 1, 4]),
    ("brilho-de-prata", "Semijoias novas da semana", "live", None, 1207, "jewelry", ["semijoias", "prata"], [0, 1, 2, 4]),
    ("pequeno-mundo", "Inverno kids: moletons a partir de R$74", "live", None, 388, "kids,winter", ["infantil", "blusadefrio"], [0, 1, 3]),
    ("casa-brisa", "Mantas e edredons para o frio", "scheduled", 90, 0, "blanket,bedroom", ["inverno", "casa", "manta"], [0, 4, 1]),
    ("pe-direito", "Botas e coturnos para o inverno", "scheduled", 180, 0, "boots,leather", ["bota", "inverno"], [1, 0, 2]),
    ("inverno-urbano", "Lançamento coleção jaquetas", "scheduled", 1440, 0, "jacket,fashion", ["jaqueta", "inverno"], [2, 4]),
    ("tecnovila", "Setup de live: ring light e acessórios", "scheduled", 300, 0, "ringlight", ["ringlight", "criador"], [5, 1, 4]),
]

out = ["-- LIVESHOP · dados de exemplo (pode apagar quando lançar)", ""]
out.append("insert into public.categories (id, name, slug, icon, is_adult, sort_order) values")
rows = [f"  ({q(uid('cat', s))}, {q(n)}, {q(s)}, {q(i)}, false, {k})" for k, (n, s, i) in enumerate(categories)]
rows.append(f"  ({q(uid('cat', ADULT[1]))}, {q(ADULT[0])}, {q(ADULT[1])}, {q(ADULT[2])}, true, 99)")
out.append(",\n".join(rows) + ";\n")

store_rows, prod_rows, img_rows, var_rows, tag_calls = [], [], [], [], []
for si, (name, slug, cat, city, uf, rating, rc, fsm, days, fast, desc, prods) in enumerate(stores):
    sid = uid("store", slug)
    store_rows.append(
        f"  ({q(sid)}, {q(name)}, {q(slug)}, null, {q(img(prods[0][4], 900 + si, 1200, 500))}, {q(desc)}, 'cnpj', {q(city)}, {q(uf)}, "
        f"{q(uid('cat', cat))}, 'approved', {rating}, {rc}, {fsm}, {days}, {str(fast).lower()})")
    for pi, (pn, price, promo, stock, kw, tags, variants) in enumerate(prods):
        pid = uid("prod", slug, str(pi))
        prod_rows.append(f"  ({q(pid)}, {q(sid)}, {q(uid('cat', cat))}, {q(pn)}, {q(pn + ' — ' + desc.split('.')[0] + '.')}, {price}, {promo if promo else 'null'}, {stock})")
        for k in range(3):
            img_rows.append(f"  ({q(pid)}, {q(img(kw, si * 100 + pi * 10 + k))}, {k})")
        for vi, v in enumerate(variants):
            var_rows.append(f"  ({q(pid)}, {q('Tamanho' if v[0].isdigit() or v in ('P','M','G','GG','Único','Casal','Queen','King') else 'Opção')}, {q(v)}, {max(stock // max(len(variants),1), 1)})")
        tag_calls.append((pid, tags))

out.append("-- Lojas de exemplo não têm dono (owner_id nulo). O trigger de proteção é desligado só durante o seed.")
out.append("alter table public.stores disable trigger stores_protect;")
out.append("insert into public.stores (id, name, slug, logo_url, cover_url, description, document_type, city, state, category_id, status, rating, rating_count, free_shipping_min, shipping_days, fast_delivery) values")
out.append(",\n".join(store_rows) + ";")
out.append("alter table public.stores enable trigger stores_protect;\n")
out.append("insert into public.products (id, store_id, category_id, name, description, price, promo_price, stock) values")
out.append(",\n".join(prod_rows) + ";\n")
out.append("insert into public.product_images (product_id, url, position) values")
out.append(",\n".join(img_rows) + ";\n")
out.append("insert into public.product_variants (product_id, name, value, stock) values")
out.append(",\n".join(var_rows) + ";\n")

# hashtags direto (seed roda como superusuário, sem passar pela checagem de dono)
all_tags = sorted({public for _, t in tag_calls for public in t} | {t for l in lives for t in l[6]})
out.append("insert into public.hashtags (tag) values " + ", ".join(f"({q(t)})" for t in all_tags) + " on conflict do nothing;\n")
ph = []
for pid, tags in tag_calls:
    for t in tags:
        ph.append(f"  ({q(pid)}, (select id from public.hashtags where tag = {q(t)}))")
out.append("insert into public.product_hashtags (product_id, hashtag_id) values")
out.append(",\n".join(ph) + ";\n")

store_by_slug = {s[1]: s for s in stores}
live_rows, lp_rows, lh_rows = [], [], []
for li, (slug, title, status, mins, viewers, kw, tags, pidx) in enumerate(lives):
    lid = uid("live", str(li))
    sid = uid("store", slug)
    featured = uid("prod", slug, str(pidx[0]))
    sched = f"now() + interval '{mins} minutes'" if mins else "null"
    started = "now() - interval '" + str(10 + li * 7) + " minutes'" if status == "live" else "null"
    live_rows.append(f"  ({q(lid)}, {q(sid)}, {q(title)}, {q(img(kw, 500 + li, 540, 960))}, {q(status)}, {sched}, {started}, {viewers}, {viewers}, {q(featured)})")
    for pos, i in enumerate(pidx):
        lp_rows.append(f"  ({q(lid)}, {q(uid('prod', slug, str(i)))}, {pos})")
    for t in tags:
        lh_rows.append(f"  ({q(lid)}, (select id from public.hashtags where tag = {q(t)}))")
out.append("insert into public.lives (id, store_id, title, cover_url, status, scheduled_at, started_at, viewers_count, peak_viewers, featured_product_id) values")
out.append(",\n".join(live_rows) + ";\n")
out.append("insert into public.live_products (live_id, product_id, position) values")
out.append(",\n".join(lp_rows) + ";\n")
out.append("insert into public.live_hashtags (live_id, hashtag_id) values")
out.append(",\n".join(lh_rows) + ";\n")
out.append("update public.platform_settings set featured_hashtags = array['blusadefrio','inverno','maquiagem','tenis'] where id = 1;")

path = pathlib.Path(__file__).resolve().parent.parent / "supabase/migrations/20261025000003_seed.sql"
path.write_text("\n".join(out) + "\n")
print("ok", path, len(prod_rows), "produtos", len(live_rows), "lives")
