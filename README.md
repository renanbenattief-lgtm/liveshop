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

## Próximas fases

2. Vídeo ao vivo real (LiveKit ou Mux) + chat e espectadores em tempo real
3. Checkout com split de pagamento (Mercado Pago) e pedidos
4. Oferta relâmpago, replays, planos para lojistas, área +18 separada
