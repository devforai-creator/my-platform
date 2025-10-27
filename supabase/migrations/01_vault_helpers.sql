-- ============================================
-- Supabase Vault Helper Functions
-- API 키 암호화 저장을 위한 Vault RPC 함수
-- ============================================

-- 1. Vault에 시크릿 생성
create or replace function public.create_secret(secret_name text, secret_value text)
returns uuid
language plpgsql
security definer
as $$
declare
  secret_id uuid;
begin
  -- vault.create_secret 호출
  select vault.create_secret(secret_value, secret_name) into secret_id;
  return secret_id;
end;
$$;

-- 2. Vault에서 시크릿 삭제
create or replace function public.delete_secret(secret_name text)
returns void
language plpgsql
security definer
as $$
begin
  delete from vault.secrets where name = secret_name;
end;
$$;

-- 3. Vault에서 복호화된 시크릿 가져오기 (서버 전용)
create or replace function public.get_decrypted_secret(secret_name text)
returns text
language plpgsql
security definer
as $$
declare
  secret_value text;
begin
  select decrypted_secret into secret_value
  from vault.decrypted_secrets
  where name = secret_name;

  return secret_value;
end;
$$;

-- 보안: 이 함수들은 인증된 사용자만 호출 가능
revoke execute on function public.create_secret from anon, public;
revoke execute on function public.delete_secret from anon, public;
revoke execute on function public.get_decrypted_secret from anon, public;

grant execute on function public.create_secret to authenticated;
grant execute on function public.delete_secret to authenticated;
grant execute on function public.get_decrypted_secret to authenticated;
