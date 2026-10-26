"""Troca as fotos de exemplo por imagens do Unsplash (o loremflickr parou de responder)."""
import pathlib
U = lambda i, w=600, h=800: f"https://images.unsplash.com/photo-{i}?w={w}&h={h}&fit=crop&auto=format&q=70"
P = {
 "Blusa de frio tricô gola alta": "1576566588028-4147f3842f27", "Moletom canguru felpado": "1556821840-3a63f95609a7",
 "Jaqueta puffer impermeável": "1591047139829-d91aecb6caea", "Cachecol de lã": "1520639888713-7851133b1ed0",
 "Cardigan oversized": "1434389677669-e08b4cac3105", "Calça moletom jogger": "1490481651871-ab68de25d43d",
 "Tênis casual couro branco": "1549298916-b41d501d3772", "Bota coturno feminina": "1543163521-1bf539c55dd2",
 "Sapatênis masculino": "1600185365483-26d7a4cc7519", "Chinelo slide": "1603487742131-4160ec999306",
 "Tênis de corrida leve": "1542291026-7eec264c27ff",
 "Base líquida matte 30ml": "1596462502278-27bfdc403348", "Paleta de sombras 12 cores": "1512496015851-a90fb38ba796",
 "Sérum vitamina C": "1620916566398-39f1143ab7be", "Kit pincéis 10 peças": "1522335789203-aabd1fc54bc9",
 "Batom líquido longa duração": "1586790170083-2f9ceadc732d", "Protetor solar facial FPS 50": "1556228578-8c89e6adf883",
 "Fone bluetooth com cancelamento de ruído": "1505740420928-5e560c06d30e", "Carregador turbo 30W USB-C": "1583394838336-acd977736f90",
 "Smartwatch tela AMOLED": "1546868871-7041f2a55e12", "Caixa de som portátil à prova d'água": "1608043152269-423dbba4e7e1",
 "Power bank 20.000 mAh": "1625772452859-1c03d5bf1137", "Ring light 26cm com tripé": "1611930022073-b7a4ba5fcccd",
 "Manta de microfibra casal": "1580870069867-74c57ee1bb07", "Jogo de cama 4 peças algodão": "1522771739844-6a9f6d5f14af",
 "Kit 4 toalhas de banho": "1584100936595-c0654b55a2e2", "Almofada decorativa veludo": "1555041469-a586c61ea9bc",
 "Edredom dupla face": "1631049307264-da0ec9d70304",
 "Conjunto moletom infantil": "1519238263530-99bdd11df2ea", "Pijama infantil algodão": "1503944583220-79d8926ad5e2",
 "Blocos de montar 200 peças": "1587654780291-39c9404d746b", "Tênis infantil com luz": "1460353581641-37baddab0fa2",
 "Mochila escolar": "1553062407-98eeb64c6a62",
 "Legging cintura alta": "1506629082955-511b1aa562c8", "Top esportivo": "1518611012118-696072aa579a",
 "Garrafa térmica 1L": "1602143407151-7111542de6e8", "Kit elásticos de resistência": "1598289431512-b97b0917affc",
 "Corta-vento esportivo": "1517836357463-d25dfeac3438",
 "Colar ponto de luz prata 925": "1599643478518-a784e5dc4c8f", "Brinco argola média": "1535632066927-ab7c9ab60908",
 "Anel solitário": "1605100804763-247f67b3557e", "Pulseira riviera": "1611591437281-460bfbe1220a",
 "Relógio feminino dourado": "1524592094714-0f0654e20314",
}
STORE_COVER = {"inverno-urbano": "1483985988355-763728e1935b", "pe-direito": "1460353581641-37baddab0fa2", "glow-make": "1512496015851-a90fb38ba796",
  "tecnovila": "1505740420928-5e560c06d30e", "casa-brisa": "1522771739844-6a9f6d5f14af", "pequeno-mundo": "1587654780291-39c9404d746b",
  "arena-fit": "1571019613454-1cb2f99b2d8b", "brilho-de-prata": "1515562141207-7a88fb7ce338"}
LIVE_COVER = {"Queima de estoque de blusas de frio": "1483985988355-763728e1935b", "Testando bases em todos os tons": "1522335789203-aabd1fc54bc9",
  "Fones com até 30% off ao vivo": "1583394838336-acd977736f90", "Look de treino + corta-vento": "1571019613454-1cb2f99b2d8b",
  "Semijoias novas da semana": "1515562141207-7a88fb7ce338", "Inverno kids: moletons a partir de R$74": "1519238263530-99bdd11df2ea",
  "Mantas e edredons para o frio": "1522771739844-6a9f6d5f14af", "Botas e coturnos para o inverno": "1543163521-1bf539c55dd2",
  "Lançamento coleção jaquetas": "1591047139829-d91aecb6caea", "Setup de live: ring light e acessórios": "1611930022073-b7a4ba5fcccd"}
q = lambda s: "'" + s.replace("'", "''") + "'"
out = ["-- Fotos de exemplo via Unsplash"]
out.append("with m(name, img) as (values " + ", ".join(f"({q(k)}, {q(v)})" for k, v in P.items()) + ")\n"
  "update public.product_images pi set url = case pi.position\n"
  "  when 0 then 'https://images.unsplash.com/photo-' || m.img || '?w=600&h=800&fit=crop&auto=format&q=70'\n"
  "  when 1 then 'https://images.unsplash.com/photo-' || m.img || '?w=600&h=800&fit=crop&crop=top&auto=format&q=70'\n"
  "  else 'https://images.unsplash.com/photo-' || m.img || '?w=600&h=800&fit=crop&crop=bottom&auto=format&q=70' end\n"
  "from public.products p join m on m.name = p.name where pi.product_id = p.id and pi.url like '%loremflickr%';")
out.append("alter table public.stores disable trigger stores_protect;")
for slug, i in STORE_COVER.items():
    out.append(f"update public.stores set cover_url = {q(U(i, 1200, 500))} where slug = {q(slug)} and cover_url like '%loremflickr%';")
out.append("alter table public.stores enable trigger stores_protect;")
for t, i in LIVE_COVER.items():
    out.append(f"update public.lives set cover_url = {q(U(i, 540, 960))} where title = {q(t)} and cover_url like '%loremflickr%';")
pathlib.Path(__file__).resolve().parent.parent.joinpath("supabase/migrations/20261025000005_seed_images.sql").write_text("\n".join(out) + "\n")
print("\n".join(out))
