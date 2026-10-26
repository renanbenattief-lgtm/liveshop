-- Loja suspensa ou reprovada sai do ar: encerra lives e batalhas ao vivo
create or replace function public.end_lives_when_blocked()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('suspended', 'rejected') and old.status is distinct from new.status then
    update public.lives set status = 'ended', ended_at = now() where store_id = new.id and status = 'live';
    update public.battles set status = 'ended', ended_at = now()
      where status = 'live' and id in (select battle_id from public.battle_participants where store_id = new.id);
    update public.battles set status = 'cancelled'
      where status in ('invited', 'scheduled') and id in (select battle_id from public.battle_participants where store_id = new.id);
  end if;
  return null;
end $$;
create trigger stores_end_lives_when_blocked after update of status on public.stores
  for each row execute function public.end_lives_when_blocked();
revoke execute on function public.end_lives_when_blocked() from public, anon, authenticated;
