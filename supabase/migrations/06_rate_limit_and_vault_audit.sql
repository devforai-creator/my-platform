-- ============================================
-- Rate limiting, usage telemetry, and Vault audit hardening
-- ============================================

-- 1. Chat rate limiting ledger
create table public.chat_rate_limits (
  user_id uuid not null references public.profiles(id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null default 0,
  constraint chat_rate_limits_pkey primary key (user_id, window_start)
);

alter table public.chat_rate_limits enable row level security;

-- 2. Usage telemetry table
create table public.chat_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  chat_id uuid not null references public.chats(id) on delete cascade,
  api_key_id uuid references public.api_keys(id) on delete set null,
  model_provider text not null,
  model_name text,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  request_id uuid not null,
  created_at timestamptz not null default now()
);

alter table public.chat_usage_events enable row level security;

create policy "Users can view their usage events"
  on public.chat_usage_events for select
  using (auth.uid() = user_id);

create policy "Users can insert their usage events"
  on public.chat_usage_events for insert
  with check (auth.uid() = user_id);

create index chat_usage_events_user_created_idx
  on public.chat_usage_events(user_id, created_at desc);

-- 3. Vault audit log
create table public.vault_secret_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  secret_name text not null,
  action text not null check (action in ('create', 'delete', 'attempt_denied')),
  details text,
  created_at timestamptz not null default now()
);

alter table public.vault_secret_audit enable row level security;

-- Only service role should read audit events.
revoke all on table public.vault_secret_audit from public, anon, authenticated;

-- 4. Rate limiting function
create or replace function public.check_chat_rate_limit(
  target_user_id uuid,
  window_seconds integer,
  max_requests integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  bucket_start timestamptz;
  request_total integer;
  epoch_now integer;
begin
  if target_user_id is null then
    raise exception 'target_user_id is required'
      using errcode = '22004';
  end if;

  if window_seconds is null or window_seconds <= 0 then
    raise exception 'window_seconds must be positive'
      using errcode = '22023';
  end if;

  if max_requests is null or max_requests <= 0 then
    raise exception 'max_requests must be positive'
      using errcode = '22023';
  end if;

  epoch_now := floor(extract(epoch from now()))::integer;
  bucket_start :=
    to_timestamp((epoch_now / window_seconds) * window_seconds)::timestamptz;

  insert into public.chat_rate_limits (user_id, window_start, request_count)
    values (target_user_id, bucket_start, 1)
  on conflict (user_id, window_start)
    do update set request_count = public.chat_rate_limits.request_count + 1
    returning public.chat_rate_limits.request_count into request_total;

  if request_total <= max_requests then
    allowed := true;
    remaining := max_requests - request_total;
    retry_after := 0;
  else
    allowed := false;
    remaining := 0;
    retry_after := window_seconds - (epoch_now % window_seconds);
  end if;

  -- Garbage collect old windows for this user (best effort)
  delete from public.chat_rate_limits
   where user_id = target_user_id
     and window_start < bucket_start - interval '1 day';

  return query select allowed, remaining, retry_after;
end;
$$;

revoke all on function public.check_chat_rate_limit(uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.check_chat_rate_limit(uuid, integer, integer)
  to service_role;

-- 5. Hardened Vault helper functions with audit logging
drop function if exists public.create_secret(text, text);

create or replace function public.create_secret(secret_name text, secret_value text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requester uuid;
  secret_id uuid;
  expected_prefix text;
  suffix text;
  max_keys constant integer := 10;
  current_key_count integer;
begin
  requester := auth.uid();

  if requester is null then
    insert into public.vault_secret_audit (user_id, secret_name, action, details)
    values (null, coalesce(secret_name, ''), 'attempt_denied', 'unauthenticated create_secret call');
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  if secret_name is null or length(secret_name) = 0 then
    insert into public.vault_secret_audit (user_id, secret_name, action, details)
    values (requester, coalesce(secret_name, ''), 'attempt_denied', 'secret name required');
    raise exception 'Secret name required'
      using errcode = '22004';
  end if;

  expected_prefix := 'apikey_' || requester::text || '_';

  if left(secret_name, length(expected_prefix)) <> expected_prefix then
    insert into public.vault_secret_audit (user_id, secret_name, action, details)
    values (requester, secret_name, 'attempt_denied', 'prefix mismatch');
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  suffix := substring(secret_name from length(expected_prefix) + 1);

  if suffix !~ '^[a-z]+_[0-9]+$' then
    insert into public.vault_secret_audit (user_id, secret_name, action, details)
    values (requester, secret_name, 'attempt_denied', 'invalid suffix format');
    raise exception 'Invalid secret name format'
      using errcode = '22023';
  end if;

  select count(*) into current_key_count
  from public.api_keys
  where user_id = requester;

  if current_key_count >= max_keys then
    insert into public.vault_secret_audit (user_id, secret_name, action, details)
    values (requester, secret_name, 'attempt_denied', 'api key quota exceeded');
    raise exception 'API key quota exceeded'
      using errcode = '54013';
  end if;

  select vault.create_secret(secret_value, secret_name) into secret_id;

  insert into public.vault_secret_audit (user_id, secret_name, action, details)
  values (requester, secret_name, 'create', null);

  return secret_id;
end;
$$;

drop function if exists public.delete_secret(text);

create or replace function public.delete_secret(secret_name text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requester uuid;
  expected_prefix text;
  suffix text;
  requester_prefix text;
begin
  requester := auth.uid();

  if requester is null then
    insert into public.vault_secret_audit (user_id, secret_name, action, details)
    values (null, coalesce(secret_name, ''), 'attempt_denied', 'unauthenticated delete_secret call');
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  if secret_name is null or length(secret_name) = 0 then
    insert into public.vault_secret_audit (user_id, secret_name, action, details)
    values (requester, coalesce(secret_name, ''), 'attempt_denied', 'secret name required');
    raise exception 'Secret name required'
      using errcode = '22004';
  end if;

  requester_prefix := 'apikey_' || requester::text || '_';

  expected_prefix := requester_prefix;

  suffix := substring(secret_name from length(expected_prefix) + 1);

  if not exists (
    select 1
    from public.api_keys
    where vault_secret_name = secret_name
      and user_id = requester
  )
  and left(secret_name, length(expected_prefix)) <> expected_prefix then
    insert into public.vault_secret_audit (user_id, secret_name, action, details)
    values (requester, secret_name, 'attempt_denied', 'ownership check failed');
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  if suffix !~ '^[a-z]+_[0-9]+$' then
    insert into public.vault_secret_audit (user_id, secret_name, action, details)
    values (requester, secret_name, 'attempt_denied', 'invalid suffix format');
    raise exception 'Invalid secret name format'
      using errcode = '22023';
  end if;

  delete from vault.secrets
  where name = secret_name;

  if not found then
    insert into public.vault_secret_audit (user_id, secret_name, action, details)
    values (requester, secret_name, 'attempt_denied', 'secret not found');
    raise exception 'Secret not found'
      using errcode = 'P0002';
  end if;

  insert into public.vault_secret_audit (user_id, secret_name, action, details)
  values (requester, secret_name, 'delete', null);
end;
$$;

revoke execute on function public.create_secret(text, text) from anon, public;
revoke execute on function public.delete_secret(text) from anon, public;

grant execute on function public.create_secret(text, text) to authenticated;
grant execute on function public.delete_secret(text) to authenticated;
