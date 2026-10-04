# Investigator (ALG-AI-02)

AI document investigation: upload docs, ask questions, get cited answers with conflict detection and honest uncertainty.

## Architecture

```mermaid
flowchart LR
  UI[Next.js App + Zustand] -->|direct upload| ST[(Supabase Storage)]
  ST -->|storage path only| ING[/api/ingest]
  ING -->|OCR/parse| GEM[Gemini vision + embeddings]
  ING -->|chunks+vectors| DB[(Supabase Postgres+pgvector)]
  UI -->|question| ASK[/api/ask]
  ASK -->|embed| GEM
  ASK -->|hybrid RPC match_chunks| DB
  ASK -->|claims+compare+answer| GROQ[Groq Llama 3.3 70B]
  ASK -->|verdict+citations+conflicts| UI
```

## Setup

1. Supabase: enable `pgvector` extension, run `supabase/migrations/0001_init.sql` then `supabase/migrations/0002_storage.sql` (creates the private `documents` bucket + per-user RLS).
2. Google OAuth: add `https://<vercel-url>/auth/callback` to Google + Supabase auth redirect lists.
3. `cp .env.example .env.local` and fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`.
4. `npm install && npm run dev`.
5. Seed demo: `DEMO_USER_ID=<uuid> npm run seed:demo`; eval: `EVAL_WORKSPACE_ID=<id> npm run eval`.

## Fix notes

**Upload root cause:** files were previously sent as multipart form data through the Vercel serverless function (`/api/ingest`), which caps request bodies at ~4.5 MB — anything larger failed. Validation also relied on browser MIME types, which are commonly empty for `.md` and `.docx`, so valid files were rejected.

**Fix:** the browser now uploads directly to Supabase Storage (XHR with real progress events) under `<user_id>/<workspace_id>/`, and `/api/ingest` receives only the storage path + metadata. The server downloads from Storage, validates by file extension (not MIME), and enforces that the path belongs to the caller. Storage RLS (`0002_storage.sql`) restricts each user to their own folder.

## Folder structure

```
app/ page.tsx (landing) · app/ (protected) · api/ingest|ask|conflict-report|workspaces · auth/callback
components/ AppShell Chat SourceViewer ConflictReport UploadZone Header Sidebar CommandPalette MobileNav
components/ui/button.tsx · ThemeToggle · ThemeToaster · PublicHeader
lib/ supabase-browser supabase-server supabase-admin groq gemini chunk auth utils types
store/ useStore (zustand)
supabase/migrations/ 0001_init.sql · 0002_storage.sql
demo/ 3 seeded docs · scripts/seed-demo.ts · tests/eval.ts
```

## Known limitations

- Serverless 60s limit: large PDFs may need smaller batches; scanned-PDF OCR samples first bytes only.
- Embeddings 768-dim (Gemini text-embedding-004); HNSW index approximate.
- Conflict scan samples 60 chunks per workspace.

## Disclosure

- External APIs: Supabase (auth/db/storage), Groq Llama 3.3 70B (claims/conflicts/answers), Google Gemini (embeddings text-embedding-004, vision gemini-1.5-flash OCR).
- AI-assisted components: claim extraction, pairwise conflict labeling, answer synthesis — all quote-validated server-side against chunk text; documents treated strictly as data (prompt-injection guard in system prompts).
