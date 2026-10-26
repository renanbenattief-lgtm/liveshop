-- Funções de trigger: ninguém chama pela API
revoke execute on function public.handle_new_user(), public.protect_profile_role(), public.protect_store_fields(),
  public.store_owner_becomes_seller(), public.bump_hashtag_count() from public, anon, authenticated;

-- Ações de vendedor/admin: só usuários logados (as funções checam dono/admin por dentro)
revoke execute on function public.set_product_tags(uuid, text[]), public.set_live_tags(uuid, text[]),
  public.start_live(uuid), public.end_live(uuid), public.admin_overview() from public, anon;
grant execute on function public.set_product_tags(uuid, text[]), public.set_live_tags(uuid, text[]),
  public.start_live(uuid), public.end_live(uuid), public.admin_overview() to authenticated;
