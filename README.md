# LIVESHOP (nome provisório)

Marketplace onde **toda venda acontece por live**. O comprador busca o que quer
(ex.: `#blusadefrio`), filtra por frete grátis, entrega rápida, localização, preço
e avaliação, e entra direto nas lojas que estão vendendo aquilo ao vivo.

## Stack

- React 19 + Vite + TypeScript + Tailwind
- Supabase (banco, login, storage de imagens, tempo real)
- PWA instalável no celular

## Rodar no computador

```bash
npm install
cp .env.example .env   # já vem preenchido com o projeto "liveshop" do Supabase
npm run dev
```

## Publicar na Vercel

1. Importe este repositório na Vercel (framework: Vite).
2. Em *Environment Variables*, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Depois do primeiro deploy, no Supabase em **Authentication → URL Configuration**,
   coloque a URL da Vercel em *Site URL* (para o link de confirmação de e-mail funcionar).

## Banco de dados

As migrations em `supabase/migrations` já foram aplicadas no projeto **liveshop**
(região São Paulo). Elas criam:

- tabelas: perfis, endereços, categorias, lojas, produtos (fotos, variações), hashtags,
  lives, produtos da live, seguidores e lembretes de live
- segurança por linha (RLS): cada lojista só mexe na própria loja; só admin aprova lojas
- funções de busca: `search_lives`, `search_stores`, `trending_hashtags`
- dados de exemplo: 8 lojas, 43 produtos e 10 lives (pode apagar antes de lançar)

O e-mail listado em `platform_settings.admin_emails` vira **admin** ao criar a conta.

## O que já funciona (Fase 1)

**Comprador:** home com lives ao vivo, hashtags em alta e categorias · busca por texto,
hashtag ou categoria com filtros e ordenação · página da live (formato 9:16, moldura
padrão, produto em destaque, lista de produtos, chat de exemplo) · loja · produto ·
seguir loja · “me avise quando entrar ao vivo” · conta com endereços (CEP automático).

**Vendedor:** abrir loja (fica em análise) · produtos com fotos, variações e hashtags ·
preparar/agendar live escolhendo produtos · estúdio com prévia da câmera do celular e
botão para fixar produto em destaque · frete (grátis, 48h, prazo, estados) · painel.

**Admin:** visão geral · aprovar/reprovar/suspender lojas · encerrar lives ·
categorias (inclusive +18 oculta) · comissão, hashtags em destaque e admins.

## CNPJ ativo obrigatório

Toda loja precisa de **CNPJ ATIVO na Receita Federal** para vender.

- O cadastro aceita só CNPJ (dígitos validados) e consulta a situação na hora (BrasilAPI, com reserva na CNPJ.ws).
- A consulta oficial roda no servidor, na função `supabase/functions/verify-cnpj`, e grava situação, razão social e data na loja.
  O lojista não consegue alterar esses campos.
- Sem CNPJ ATIVO: a loja não pode ser aprovada, entrar ao vivo nem participar de batalhas.
- Se uma nova consulta mostrar o CNPJ inativo (inapto, baixado, suspenso), a loja é suspensa e as lives dela saem do ar.
- O admin vê a situação de cada loja e pode consultar a Receita de novo com um toque.
- As 8 lojas de exemplo são marcadas como `is_demo` e não exigem CNPJ.

## Batalhas do Bem

Duas lojas vendem o mesmo produto, pelo mesmo preço, numa live dupla, sem perdedor.

- **Convite:** a loja escolhe um produto e o sistema sugere lojas com produto parecido e o mesmo preço.
- **Termo:** cada loja aceita o termo (versionado; guarda data, hora e versão) e declara o mesmo custo unitário.
- **Meta conjunta:** as duas lojas enchem a mesma barra; ao bater a meta, libera o prêmio para quem assiste.
- **Divisão:** sai a comissão, cada loja recebe o custo das peças e o frete que ela pagou, e o lucro é dividido igualmente
  (função `battle_split` no banco, mesma conta em `src/lib/battles.ts`).
- O termo de exemplo deve ser revisado por um advogado antes do lançamento (admin → Batalhas → editar termo).
- As vendas entram no extrato automaticamente quando o checkout com split for ligado (fase 3).

## Seguidores e avisos

- Comprador segue lojas (botão Seguir na live e na página da loja) e vê todas em **Seguindo**.
- Quando uma loja seguida entra ao vivo, ou entra numa Batalha do Bem, o seguidor recebe um **aviso** no app
  (sino com contador, página **Avisos** e aviso na tela em tempo real). Quem pediu "me avise" também recebe.
- O lojista recebe aviso de novo seguidor e vê no painel quantos seguidores ganhou na semana.
- Avisos fora do app (push no celular, e-mail ou WhatsApp) ficam para uma próxima etapa.

## Campanhas temáticas

- O admin cria campanhas por data (nome, frase, hashtag, cor, banner, início, fim e desconto mínimo opcional).
- Campanhas no ar e próximas aparecem em banner na home; cada uma tem página própria (`/campanha/slug`).
- O lojista entra na campanha (precisa estar aprovado e com CNPJ ativo) e marca suas lives nela; a hashtag da campanha
  entra na live automaticamente e a live só pode ser marcada se acontecer dentro do período.
- Exemplos: Esquenta Black Friday (no ar), Black Friday, Natal e Dia das Mães.

## Próximas fases

2. Vídeo ao vivo real (LiveKit ou Mux) + chat e espectadores em tempo real
3. Checkout com split de pagamento (Mercado Pago) e pedidos
4. Oferta relâmpago, replays, planos para lojistas, área +18 separada
