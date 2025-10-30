-- ============================================
-- Harden get_decrypted_secret RPC so only trusted
-- service contexts can decrypt API keys.
-- ============================================

-- Drop legacy function that relied solely on auth.uid()
drop function if exists public.get_decrypted_secret(text);

create or replace function public.get_decrypted_secret(
  secret_name text,
  requester uuid default null
)
returns text
language plpgsql
security definer
as $$
declare
  effective_requester uuid;
  secret_value text;
begin
  effective_requester := coalesce(requester, auth.uid());

  if effective_requester is null then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.api_keys
    where vault_secret_name = secret_name
      and user_id = effective_requester
  ) then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select decrypted_secret
    into secret_value
  from vault.decrypted_secrets
  where name = secret_name;

  if secret_value is null then
    raise exception 'Secret not found'
      using errcode = 'P0002';
  end if;

  return secret_value;
end;
$$;

-- Ensure only service role can execute; block anon/authenticated contexts.
revoke all on function public.get_decrypted_secret(text, uuid) from public, anon, authenticated;
grant execute on function public.get_decrypted_secret(text, uuid) to service_role;
