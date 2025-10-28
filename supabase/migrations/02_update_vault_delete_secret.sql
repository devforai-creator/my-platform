-- ============================================
-- Vault delete_secret ownership check refinement
-- Allows cleanup after api_keys row deletion while
-- still restricting access to the owning user.
-- ============================================

create or replace function public.delete_secret(secret_name text)
returns void
language plpgsql
security definer
as $$
declare
  requester uuid;
  expected_prefix text;
begin
  requester := auth.uid();

  if requester is null then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  expected_prefix := 'apikey_' || requester::text || '_';

  if not exists (
    select 1
    from public.api_keys
    where vault_secret_name = secret_name
      and user_id = requester
  )
  and left(secret_name, length(expected_prefix)) <> expected_prefix then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  delete from vault.secrets
  where name = secret_name;
end;
$$;
