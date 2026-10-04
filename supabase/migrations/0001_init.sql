-- Investigator ALG-AI-02 migration
-- Run in Supabase SQL editor. Requires pgvector extension.
-- Enable pgvector first: create extension if not exists vector;

create extension if not exists vector;
create extension if not exists pg_trgm;

-- workspaces
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);
alter table workspaces enable row level security;
drop policy if exists "ws_owner" on workspaces;
create policy "ws_owner" on workspaces for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- documents
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  file_type text not null,
  storage_path text not null,
  file_hash text,
  status text not null default 'processing' check (status in ('processing','ready','failed')),
  error text,
  doc_date date,
  page_count int default 1,
  created_at timestamptz default now(),
  unique (workspace_id, file_hash)
);
alter table documents enable row level security;
drop policy if exists "doc_owner" on documents;
create policy "doc_owner" on documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- chunks (embedding 768 = Gemini text-embedding-004)
create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  page_number int not null default 1,
  section_title text,
  chunk_index int not null default 0,
  embedding vector(768),
  content_tsv tsvector generated always as (to_tsvector('english', content)) stored
);
alter table chunks enable row level security;
drop policy if exists "chunk_owner" on chunks;
create policy "chunk_owner" on chunks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists chunks_embedding_hnsw on chunks using hnsw (embedding vector_cosine_ops);
create index if not exists chunks_tsv_gin on chunks using gin (content_tsv);
create index if not exists chunks_workspace_idx on chunks (workspace_id);
create index if not exists chunks_document_idx on chunks (document_id);

-- conversations
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text default 'New investigation',
  created_at timestamptz default now()
);
alter table conversations enable row level security;
drop policy if exists "conv_owner" on conversations;
create policy "conv_owner" on conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- messages (answers store citations + verdict JSON)
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  citations jsonb default '[]',
  verdict text,
  conflicts jsonb default '[]',
  confidence float,
  uncertainty_note text,
  created_at timestamptz default now()
);
alter table messages enable row level security;
drop policy if exists "msg_owner" on messages;
create policy "msg_owner" on messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Hybrid search RPC: vector cosine + keyword ts_rank, merged with RRF-ish weighting
create or replace function match_chunks(
  query_embedding vector(768),
  p_workspace_id uuid,
  p_k int default 10,
  p_query_text text default ''
)
returns table (
  id uuid, document_id uuid, content text, page_number int,
  section_title text, chunk_index int, filename text, doc_date date,
  vec_score float, kw_score float, combined float
)
language sql stable as $$
  with vec as (
    select c.id, 1 - (c.embedding <=> query_embedding) as s
    from chunks c where c.workspace_id = p_workspace_id
    order by c.embedding <=> query_embedding limit p_k * 2
  ),
  kw as (
    select c.id,
      case when p_query_text = '' then 0
      else ts_rank(c.content_tsv, plainto_tsquery('english', p_query_text)) end as s
    from chunks c where c.workspace_id = p_workspace_id
      and (p_query_text = '' or c.content_tsv @@ plainto_tsquery('english', p_query_text))
    order by s desc limit p_k * 2
  )
  select c.id, c.document_id, c.content, c.page_number, c.section_title, c.chunk_index,
    d.filename, d.doc_date,
    coalesce(v.s, 0)::float as vec_score, coalesce(k.s, 0)::float as kw_score,
    (coalesce(v.s,0) * 0.7 + coalesce(k.s,0) * 0.3)::float as combined
  from chunks c
  join documents d on d.id = c.document_id
  left join vec v on v.id = c.id
  left join kw k on k.id = c.id
  where c.workspace_id = p_workspace_id and (v.id is not null or k.id is not null)
  order by combined desc limit p_k;
$$;

-- Storage: private per-user bucket. Files are stored at <user_id>/<workspace_id>/<file>,
-- so the foldername check isolates every user. The app reads chunk text from the DB
-- (RLS-protected), never via public storage URLs.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "user docs isolated" on storage.objects;
create policy "user docs isolated" on storage.objects for all
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);
