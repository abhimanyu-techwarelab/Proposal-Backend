# External Integrations

**Analysis Date:** 2026-01-14

## APIs & External Services

**OpenAI (AI Models & Embeddings):**
- Service: OpenAI API
- SDK/Client: `openai` 6.15.0 - `package.json`
- Auth: API key in `OPENAI_API_KEY` env var
- Integration Points:
  - Audio transcription (Whisper-1) - `src/ai/ai.service.ts`
  - Chat completions (GPT-4o-mini) - `src/ai/agents/general-info.agent.ts`
  - Text embeddings (text-embedding-3-large, 3072 dimensions) - `src/knowledge-base/knowledge-base.service.ts`

**Pinecone (Vector Database):**
- Service: Pinecone Vector Database
- SDK/Client: `@pinecone-database/pinecone` 6.1.3 - `package.json`
- Auth: API key in `PINECONE_API_KEY` env var
- Index: `PINECONE_INDEX_NAME=proposal-knowledge-base`
- Integration Points:
  - Namespace-based isolation per proposal - `src/knowledge-base/knowledge-base.service.ts`
  - Vector upsert operations
  - Semantic search queries for RAG

**Supabase (Cloud Storage):**
- Service: Supabase Storage (S3-compatible)
- SDK/Client: `@supabase/supabase-js` 2.78.0 - `package.json`
- Auth: Service role key in `SUPABASE_SERVICE_KEY` env var
- URL: `SUPABASE_URL` env var
- Integration Points (`src/storage/storage.service.ts`):
  - Download audio files
  - Download documents (PDF, DOCX)
  - Generate signed URLs for uploads
  - Upload files to buckets
  - Delete files
- Buckets: `template_display_image`, custom buckets

## Data Storage

**Databases:**
- PostgreSQL 14+ on external host
- Connection: `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` env vars
- Client: TypeORM 0.3.28 via `@nestjs/typeorm` - `src/app.module.ts`
- Migrations: Manual (no auto-sync in production)
- SSL: Configurable via `DB_SSL` env var

**Tables:**
- `users` - User accounts with authentication
- `organizations` - Multi-tenant organization data
- `roles`, `permissions`, `role_permissions` - RBAC system
- `proposals` - Proposal records (50+ columns)
- `templates`, `template_tags` - Proposal templates
- `tags` - Content tagging
- `plans`, `plan_features` - Subscription plans
- `features` - Feature flags

**File Storage:**
- Supabase Storage (see above)
- No local file storage

**Caching:**
- Redis for job queue only (no application caching)
- Connection: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` env vars
- Client: `ioredis` 5.8.2 - `src/app.module.ts`

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
- Implementation: Passport JWT strategy - `src/auth/strategies/jwt.strategy.ts`
- Token storage: Client-side (returned in login response)
- Session management: Stateless JWT with configurable expiry

**JWT Configuration:**
- Secret: `JWT_SECRET` env var
- Expiry: `JWT_EXPIRES_IN` env var (default: 24h)
- Library: `@nestjs/jwt` 11.0.2, `passport-jwt` 4.0.1

**Password Hashing:**
- Library: `bcrypt` 6.0.0 - `src/auth/auth.service.ts`
- Salt rounds: 10 (default)

## Monitoring & Observability

**Error Tracking:**
- Not configured
- Recommended: Sentry integration

**Analytics:**
- Not configured

**Logs:**
- NestJS Logger to stdout
- No external log aggregation configured

## CI/CD & Deployment

**Hosting:**
- Not specified in codebase
- Assumed: Docker container deployment

**CI Pipeline:**
- Not configured
- No `.github/workflows/` directory

## Environment Configuration

**Development:**
- Required env vars:
  - `PORT` - Server port
  - `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` - PostgreSQL
  - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Redis
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` - Storage
  - `OPENAI_API_KEY` - AI services
  - `PINECONE_API_KEY`, `PINECONE_INDEX_NAME` - Vector DB
  - `JWT_SECRET`, `JWT_EXPIRES_IN` - Authentication
- Secrets location: `.env` file (WARNING: should not be committed)
- Missing: `.env.example` template

**Production:**
- Secrets management: Environment variables (no vault integration)
- Database: External PostgreSQL server
- Redis: External Redis server

## Job Queue (BullMQ)

**Queue Configuration:**
- Queue name: `proposal-generation`
- Library: `bullmq` 5.66.3 via `@nestjs/bullmq` - `src/queue/queue.module.ts`
- Backend: Redis

**Job Options:**
- Retry attempts: 3
- Backoff: Exponential with 1000ms delay
- Auto-cleanup: 100 completed/failed jobs

**Job Processor:**
- Location: `src/proposals/processors/proposal.processor.ts`
- Purpose: Async proposal generation with AI

## Document Processing

**PDF Processing:**
- Library: `pdf-parse` 2.4.5 - `src/knowledge-base/knowledge-base.service.ts`
- Functionality: Extract text from PDF documents

**DOCX Processing:**
- Library: `mammoth` 1.11.0 - `src/knowledge-base/knowledge-base.service.ts`
- Functionality: Extract text from Word documents

**Markdown Processing:**
- Library: `marked` 15.0.12 - `src/templates/templates.service.ts`
- Functionality: Convert markdown to HTML

**Template Rendering:**
- Library: `handlebars` 4.7.8 - `src/templates/templates.service.ts`
- Functionality: Compile templates with data

**PDF Generation:**
- Library: `puppeteer` 24.34.0 - `src/templates/templates.service.ts`
- Functionality: Generate PDF from HTML

## API Documentation

**Swagger/OpenAPI:**
- Library: `@nestjs/swagger` 8.1.1 - `src/main.ts`
- Documentation endpoint: `/api-docs`
- Generator script: `src/swagger-generator.ts`
- Features: Bearer JWT auth, tagged endpoints

## Webhooks & Callbacks

**Incoming:**
- None configured

**Outgoing:**
- None configured

---

*Integration audit: 2026-01-14*
*Update when adding/removing external services*
