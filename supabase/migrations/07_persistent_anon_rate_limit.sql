-- ============================================
-- Persistent anonymous rate limiting
-- ============================================

create table public.anon_rate_limits (
  identifier text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  constraint anon_rate_limits_pkey primary key (identifier, window_start)
);

alter table public.anon_rate_limits enable row level security;

revoke all on table public.anon_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.anon_rate_limits to service_role;

create index anon_rate_limits_identifier_window_idx
  on public.anon_rate_limits(identifier, window_start desc);

create or replace function public.check_anon_rate_limit(
  identifier text,
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
  if identifier is null or length(identifier) = 0 then
    raise exception 'identifier is required'
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

  insert into public.anon_rate_limits (identifier, window_start, request_count)
    values (identifier, bucket_start, 1)
  on conflict (identifier, window_start)
    do update set request_count = public.anon_rate_limits.request_count + 1
    returning public.anon_rate_limits.request_count into request_total;

  if request_total <= max_requests then
    allowed := true;
    remaining := max_requests - request_total;
    retry_after := 0;
  else
    allowed := false;
    remaining := 0;
    retry_after := window_seconds - (epoch_now % window_seconds);
  end if;

  delete from public.anon_rate_limits
   where public.anon_rate_limits.identifier = identifier
     and window_start < bucket_start - interval '1 day';

  return query select allowed, remaining, retry_after;
end;
$$;

revoke all on function public.check_anon_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.check_anon_rate_limit(text, integer, integer)
  to service_role;
