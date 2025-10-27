-- ============================================
-- CharacterChat Platform - Initial Schema
-- Phase 0 MVP Database Schema
-- ============================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. Profiles (사용자 확장 정보)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- RLS 활성화
alter table public.profiles enable row level security;

-- RLS 정책
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================
-- 2. API Keys (BYOK - 암호화 저장)
-- ============================================
create table public.api_keys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  provider text not null check (provider in ('google', 'openai', 'anthropic')),
  key_name text not null,

  -- Supabase Vault에 저장된 시크릿 이름
  vault_secret_name text unique not null,

  -- 설정
  model_preference text,
  is_active boolean default true not null,
  usage_notes text,

  -- 추적
  last_used_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  -- 제약
  unique(user_id, key_name)
);

-- RLS 활성화
alter table public.api_keys enable row level security;

-- RLS 정책
create policy "Users can view their own API keys"
  on public.api_keys for select
  using (auth.uid() = user_id);

create policy "Users can insert their own API keys"
  on public.api_keys for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own API keys"
  on public.api_keys for update
  using (auth.uid() = user_id);

create policy "Users can delete their own API keys"
  on public.api_keys for delete
  using (auth.uid() = user_id);

-- 인덱스
create index api_keys_user_id_idx on public.api_keys(user_id);

-- ============================================
-- 3. Characters (캐릭터)
-- ============================================
create type character_visibility as enum ('private', 'draft', 'public');

create table public.characters (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,

  -- 기본 정보
  name text not null,
  avatar_url text,
  description text,
  system_prompt text not null,
  greeting_message text,

  -- 공유 & 상태
  visibility character_visibility default 'private' not null,
  metadata jsonb default '{}'::jsonb not null,
  archived_at timestamptz,

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- RLS 활성화
alter table public.characters enable row level security;

-- RLS 정책
create policy "Users can view their own and public characters"
  on public.characters for select
  using (
    auth.uid() = user_id
    or visibility = 'public'
  );

create policy "Users can insert their own characters"
  on public.characters for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own characters"
  on public.characters for update
  using (auth.uid() = user_id);

create policy "Users can delete their own characters"
  on public.characters for delete
  using (auth.uid() = user_id);

-- 인덱스
create index characters_user_id_visibility_idx on public.characters(user_id, visibility);
create index characters_visibility_idx on public.characters(visibility) where visibility = 'public';

-- ============================================
-- 4. Chats (채팅 세션)
-- ============================================
create table public.chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  character_id uuid references public.characters(id) on delete cascade not null,
  title text,

  -- 컨텍스트 설정
  max_context_messages int default 20 not null check (max_context_messages > 0),

  -- 모델 설정 (챗 단위 고정)
  model_config jsonb,

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- RLS 활성화
alter table public.chats enable row level security;

-- RLS 정책
create policy "Users can view their own chats"
  on public.chats for select
  using (auth.uid() = user_id);

create policy "Users can create their own chats"
  on public.chats for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own chats"
  on public.chats for update
  using (auth.uid() = user_id);

create policy "Users can delete their own chats"
  on public.chats for delete
  using (auth.uid() = user_id);

-- 인덱스
create index chats_user_id_updated_at_idx on public.chats(user_id, updated_at desc);
create index chats_character_id_idx on public.chats(character_id);

-- ============================================
-- 5. Messages (메시지)
-- ============================================
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,

  -- 정렬 안전성 보장
  sequence bigint generated always as identity,

  role text not null check (role in ('system', 'user', 'assistant')),
  content text not null,

  -- 과금/통계 대비 메타데이터
  model_used text,
  prompt_tokens int,
  completion_tokens int,
  latency_ms int,
  error_code text,

  created_at timestamptz default now() not null
);

-- RLS 활성화
alter table public.messages enable row level security;

-- RLS 정책
create policy "Users can view messages in their chats"
  on public.messages for select
  using (
    exists (
      select 1 from public.chats
      where chats.id = messages.chat_id
      and chats.user_id = auth.uid()
    )
  );

create policy "Users can insert messages in their chats"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.chats
      where chats.id = messages.chat_id
      and chats.user_id = auth.uid()
    )
  );

create policy "Users can delete messages in their chats"
  on public.messages for delete
  using (
    exists (
      select 1 from public.chats
      where chats.id = messages.chat_id
      and chats.user_id = auth.uid()
    )
  );

-- 인덱스
create index messages_chat_id_sequence_idx on public.messages(chat_id, sequence desc);
create index messages_chat_id_created_at_idx on public.messages(chat_id, created_at desc);

-- ============================================
-- 6. Triggers (updated_at 자동 갱신)
-- ============================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 각 테이블에 트리거 적용
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function update_updated_at_column();

create trigger update_api_keys_updated_at
  before update on public.api_keys
  for each row execute function update_updated_at_column();

create trigger update_characters_updated_at
  before update on public.characters
  for each row execute function update_updated_at_column();

create trigger update_chats_updated_at
  before update on public.chats
  for each row execute function update_updated_at_column();

-- ============================================
-- 7. 신규 사용자 자동 프로필 생성
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Auth 테이블에 트리거 생성
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- Schema Setup Complete!
-- ============================================
