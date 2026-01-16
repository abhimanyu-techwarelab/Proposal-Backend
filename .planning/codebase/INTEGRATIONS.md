# External Integrations

**Analysis Date:** 2026-01-16

## APIs & External Services

**AI/ML Services:**
- OpenAI API - AI-powered proposal generation
  - SDK/Client: openai npm package v6.15.0
  - Integration: `src/ai/ai.service.ts`, `src/knowledge-base/knowledge-base.service.ts`
  - Auth: API key in OPENAI_API_KEY env var
  - Endpoints used:
    - `audio.transcriptions.create()` - Whisper-1 model for audio transcription
    - `embeddings.create()` - text-embedding-3-large for vector embeddings (3072 dimensions)
    - GPT models via LangChain for proposal generation

**Vector Database:**
- Pinecone - Vector store for proposal knowledge base
  - SDK/Client: @pinecone-database/pinecone v6.1.3
  - Integration: `src/knowledge-base/knowledge-base.service.ts`
  - Auth: API key in PINECONE_API_KEY env var
  - Index: Configurable via PINECONE_INDEX_NAME (default: "proposal-knowledge-base")
  - Embedding Model: text-embedding-3-large (3072 dimensions)
  - Configuration: 1000 character chunks with 200 character overlap
  - Namespace isolation: Per-proposal namespaces for multi-tenancy

**Cloud Storage:**
- Supabase Storage - File uploads and downloads
  - SDK/Client: @supabase/supabase-js v2.78.0
  - Integration: `src/storage/storage.service.ts`
  - URL: https://yoxtsymyhtuhdnaszkzq.supabase.co (via SUPABASE_URL)
  - Auth:
    - Anonymous key: SUPABASE_ANON_KEY env var
    - Service key: SUPABASE_SERVICE_KEY env var
  - Functionality:
    - Signed URL generation (1-hour default expiration)
    - File upload/download (documents, audio files)
    - File deletion
    - Multiple buckets including `template_display_image`

## Data Storage

**Databases:**
- PostgreSQL - Primary data store
  - Connection: via DATABASE_URL or discrete env vars
  - Host: postgres.techware.co.in:32805
  - Database: Project_proposal_generator
  - Client: TypeORM v0.3.28 with pg v8.16.3
  - Auth: Username/password via DB_USERNAME, DB_PASSWORD env vars
  - SSL: Configurable via DB_SSL env var
  - Migrations: Managed separately (synchronize disabled)
  - Integration: `src/app.module.ts`

**Message Queue:**
- Redis (via BullMQ) - Async job processing
  - Host: 156.67.214.146:7379
  - Client: ioredis v5.8.2
  - Queue: "proposal-generation"
  - Auth: Password optional via REDIS_PASSWORD env var
  - Processor: `src/proposals/processors/proposal.processor.ts`
  - Retry Policy: 3 attempts with exponential backoff (1000ms initial)
  - Integration: `src/app.module.ts`, `src/queue/queue.module.ts`

## Authentication & Identity

**Auth Provider:**
- JWT Authentication - Custom implementation
  - Implementation: `src/auth/auth.module.ts`, `src/auth/auth.service.ts`
  - Secret: JWT_SECRET env var
  - Expiration: JWT_EXPIRES_IN (24h default)
  - Strategy: JwtStrategy - `src/auth/strategies/jwt.strategy.ts`
  - Guards:
    - JwtAuthGuard - `src/auth/guards/jwt-auth.guard.ts`
    - PermissionsGuard - `src/auth/guards/permissions.guard.ts`

**Password Security:**
- Hashing: bcrypt v6.0.0 (10 salt rounds)
- Implementation: `src/users/users.service.ts`, `src/auth/auth.service.ts`

## Monitoring & Observability

**Error Tracking:**
- None configured - console logging only

**Analytics:**
- None configured

**Logs:**
- Console stdout/stderr only
- NestJS Logger with tagged prefixes ([INIT], [API], [JWT], etc.)
- Extensive debug logging throughout application

## CI/CD & Deployment

**Hosting:**
- Not configured - manual deployment expected

**CI Pipeline:**
- None configured

## Environment Configuration

**Development:**
- Required env vars: PORT, DATABASE_URL (or DB_*), REDIS_HOST, REDIS_PORT, OPENAI_API_KEY, PINECONE_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, JWT_SECRET, JWT_EXPIRES_IN
- Secrets location: `.env` file in project root
- WARNING: `.env` file currently committed to repository with real credentials

**Staging:**
- Same configuration as development (no separate environment)

**Production:**
- Same configuration approach
- External PostgreSQL and Redis instances

## Webhooks & Callbacks

**Incoming:**
- None configured

**Outgoing:**
- None configured

## Workflow Integration

**Proposal Generation Pipeline:**
1. API Request → `src/proposals/proposals.controller.ts`
2. Service Layer → `src/proposals/proposals.service.ts`
3. Queue Job Submission → BullMQ (Redis)
4. Job Processing → `src/proposals/processors/proposal.processor.ts`
5. Document Processing:
   - Audio files → OpenAI Whisper transcription
   - PDF/DOCX → Mammoth/PDF-Parse extraction
6. Vector Embedding → OpenAI embeddings API
7. Knowledge Base → Pinecone storage with namespace isolation
8. AI Generation:
   - General Info Agent → OpenAI GPT (via LangChain)
   - Scope Agent → OpenAI GPT with vector search context
   - Timeline Agent → OpenAI GPT
9. Template Rendering → Handlebars
10. PDF Generation → Puppeteer (if needed)
11. Storage → Supabase
12. Database Persistence → PostgreSQL (TypeORM)

---

*Integration audit: 2026-01-16*
*Update when adding/removing external services*
