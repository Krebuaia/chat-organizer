-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query > paste > Run)

-- 1. Turn on the vector extension (lets Supabase store and compare "meaning" of text)
create extension if not exists vector;

-- 2. One row per Claude conversation you've had
create table if not exists co_conversations (
  id uuid primary key default gen_random_uuid(),
  source_uuid text unique,              -- the conversation ID from your Claude export
  title text,
  raw_text text,                        -- full flattened conversation text
  summary text,                         -- Claude's summary of what this chat is about
  ideas text,                           -- any "idea nuggets" Claude pulled out
  message_count int,
  created_at timestamptz,
  updated_at timestamptz,               -- when the chat was last added to
  embedding vector(1024),               -- Voyage embedding of the summary
  cluster_id uuid,
  source text default 'claude',         -- 'claude' or 'chatgpt'
  attachment_count int default 0,       -- how many files/images were attached, if any
  processed_at timestamptz default now()
);

-- 3. One row per theme/cluster of related conversations
create table if not exists co_clusters (
  id uuid primary key default gen_random_uuid(),
  label text,                           -- short name for the theme, e.g. "EnablementOS tools"
  synthesis text,                       -- Claude's write-up: unified concept + what's missing + next steps
  conversation_count int default 0,
  created_at timestamptz default now()
);

-- 4. Speed up similarity search across conversations
create index if not exists co_conversations_embedding_idx
  on co_conversations using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- 5. Function used by the app to find the nearest conversations to a given embedding
create or replace function match_co_conversations(
  query_embedding vector(1024),
  match_count int default 10
)
returns table (
  id uuid,
  title text,
  summary text,
  similarity float
)
language sql stable
as $$
  select
    id,
    title,
    summary,
    1 - (embedding <=> query_embedding) as similarity
  from co_conversations
  order by embedding <=> query_embedding
  limit match_count;
$$;
