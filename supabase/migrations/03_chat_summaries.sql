-- ============================================
-- Chat Summaries Table for Hierarchical Memory
-- ============================================

create table public.chat_summaries (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  level int not null check (level >= 0 and level <= 2),
  start_seq int not null check (start_seq > 0),
  end_seq int not null check (end_seq >= start_seq),
  summary text not null,
  token_count int,
  created_at timestamptz not null default now(),
  unique (chat_id, level, start_seq)
);

alter table public.chat_summaries enable row level security;

create policy "Users can view summaries for their chats"
  on public.chat_summaries
  for select
  using (
    exists (
      select 1
      from public.chats
      where chats.id = chat_id
        and chats.user_id = auth.uid()
    )
  );

create policy "Users can insert summaries for their chats"
  on public.chat_summaries
  for insert
  with check (
    exists (
      select 1
      from public.chats
      where chats.id = chat_id
        and chats.user_id = auth.uid()
    )
  );

create policy "Users can delete summaries for their chats"
  on public.chat_summaries
  for delete
  using (
    exists (
      select 1
      from public.chats
      where chats.id = chat_id
        and chats.user_id = auth.uid()
    )
  );

create index idx_chat_summaries_chat_level
  on public.chat_summaries(chat_id, level, start_seq);
