-- Campanhas de exemplo (o admin pode editar ou apagar)
insert into public.campaigns (name, slug, tagline, description, hashtag, color, banner_url, starts_at, ends_at, min_discount_percent) values
('Esquenta Black Friday', 'esquenta-black-friday', 'Descontos ao vivo todo dia até a Black',
 'Lojas participantes fazem lives diárias com ofertas antecipadas. Siga suas lojas favoritas para ser avisado quando entrarem ao vivo.',
 'esquentablackfriday', '#FF7A1A', 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1400&h=600&fit=crop&auto=format&q=70',
 '2026-10-26 00:00:00-03', '2026-11-26 23:59:59-03', 10),
('Black Friday ao vivo', 'black-friday', 'Os maiores descontos do ano, ao vivo',
 'Quatro dias de lives com os menores preços do ano. Só entram lojas com pelo menos 20% de desconto nos produtos da live.',
 'blackfriday', '#F4F1FF', 'https://images.unsplash.com/photo-1606830733744-0ad778449672?w=1400&h=600&fit=crop&auto=format&q=70',
 '2026-11-27 00:00:00-03', '2026-11-30 23:59:59-03', 20),
('Natal ao vivo', 'natal', 'Presentes de Natal com entrega garantida',
 'Lives de presentes com envio a tempo para o Natal. Use o filtro de entrega rápida para receber antes do dia 24.',
 'natal', '#3DDC84', 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=1400&h=600&fit=crop&auto=format&q=70',
 '2026-12-01 00:00:00-03', '2026-12-23 23:59:59-03', null),
('Dia das Mães', 'dia-das-maes', 'O presente perfeito, escolhido ao vivo',
 'Lojas de moda, beleza, acessórios e casa com sugestões de presente para o Dia das Mães.',
 'diadasmaes', '#FF5DA2', 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1400&h=600&fit=crop&auto=format&q=70',
 '2027-04-26 00:00:00-03', '2027-05-09 23:59:59-03', null);

-- Lojas de exemplo no Esquenta, com algumas lives marcadas
insert into public.campaign_stores (campaign_id, store_id)
select c.id, s.id from public.campaigns c, public.stores s
where c.slug = 'esquenta-black-friday' and s.slug in ('inverno-urbano', 'glow-make', 'tecnovila', 'brilho-de-prata');

update public.lives l set campaign_id = (select id from public.campaigns where slug = 'esquenta-black-friday')
where l.status in ('live', 'scheduled')
  and l.store_id in (select id from public.stores where slug in ('inverno-urbano', 'glow-make', 'tecnovila', 'brilho-de-prata'))
  and coalesce(l.scheduled_at, now()) between '2026-10-26 00:00:00-03' and '2026-11-26 23:59:59-03';
