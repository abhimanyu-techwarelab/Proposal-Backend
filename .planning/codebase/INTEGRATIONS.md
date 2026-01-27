# External Integrations

**Analysis Date:** 2026-01-27

## APIs & External Services

**AI/LLM Services:**
- **OpenAI API** - `src/ai/ai.service.ts`, `src/knowledge-base/knowledge-base.service.ts`
  - SDK/Client: openai 6.15.0, @langchain/openai 0.6.17
  - Auth: OPENAI_API_KEY environment variable (`.env`)
  - Models used:
    - GPT models for text generation (general info, scope, timeline agents)
    - Whisper-1 for audio transcription (`src/ai/ai.service.ts` line 98)
    - text-embedding-3-large for embeddings (`src/knowledge-base/knowledge-base.service.ts` line 36)
  - AI Agents:
    - GeneralInfoAgent - `src/ai/agents/general-info.agent.ts`
    - ScopeAgent - `src/ai/agents/scope.agent.ts`
    - TimelineAgent - `src/ai/agents/timeline.agent.ts`
    - FieldExtractionAgent - `src/ai/agents/field-extraction.agent.ts`

- **LangChain** - `package.json`
  - Integration: @langchain/core 0.3.80, langchain 0.3.37
  - Purpose: AI orchestration and multi-step workflows
  - Used for chaining AI operations in proposal generation

## Data Storage

**Databases:**
- **PostgreSQL 12+** - Primary relational database
  - Host: postgres.techware.co.in:32805 (`.env`)
  - Database: Project_proposal_generator
  - Client: TypeORM 0.3.28 (`src/app.module.ts`)
  - Connection: DATABASE_URL or individual DB_* env vars
  - SSL: Currently disabled (DB_SSL=false)
  - Entities: users, organizations, roles, permissions, proposals, templates, subscriptions, plans, features, tags
  - Schema: `table_schema.txt` in root directory

**Vector Database:**
- **Pinecone** - `src/knowledge-base/knowledge-base.service.ts`
  - SDK: @pinecone-database/pinecone 6.1.3
  - Index: proposal-knowledge-base (PINECONE_INDEX_NAME)
  - API Key: PINECONE_API_KEY environment variable
  - Embedding dimensions: 3072 (text-embedding-3-large)
  - Purpose: Semantic search and knowledge base indexing
  - Namespace-based proposal organization (line 74)

**File Storage:**
- **Supabase Storage** - `src/storage/storage.service.ts`
  - SDK: @supabase/supabase-js 2.78.0
  - URL: https://yoxtsymyhtuhdnaszkzq.supabase.co (`.env`)
  - Auth: SUPABASE_SERVICE_KEY for uploads, SUPABASE_ANON_KEY for public access
  - Buckets: template_display_image, proposal-audio, proposal-documents
  - Operations: uploadFile, downloadAudio, downloadDocument, getSignedUrls, deleteFile
  - Direct file management without Postgres auth

**Caching & Message Queue:**
- **Redis** - `src/app.module.ts`, `.env`
  - Host: 156.67.214.146:7379
  - Client: ioredis 5.8.2
  - Password: Not set (REDIS_PASSWORD is empty - security concern)
  - Purpose: BullMQ job queue state management

- **BullMQ** - `src/queue/queue.module.ts`
  - Package: bullmq 5.66.3, @nestjs/bullmq 11.0.4
  - Queues:
    - proposal-generation - Async proposal generation jobs
    - field-extraction - Document/audio field extraction jobs
  - Retry policy: Exponential backoff (3 attempts)
  - Processors: `src/proposals/processors/proposal.processor.ts`, `src/proposals/processors/extraction.processor.ts`

## Authentication & Authorization

**Auth Provider:**
- **JWT (JSON Web Tokens)** - Custom implementation
  - Package: @nestjs/jwt 11.0.2, passport-jwt 4.0.1
  - Secret: JWT_SECRET environment variable (`.env`)
  - Expiration: 24h (JWT_EXPIRES_IN)
  - Strategy: Passport JWT (`src/auth/strategies/jwt.strategy.ts`)
  - Guards: `src/auth/guards/jwt-auth.guard.ts`, `src/auth/guards/permissions.guard.ts`
  - Token generation: `src/auth/auth.service.ts` line 58
  - Password hashing: bcrypt 6.0.0 (line 39)

**Authorization:**
- Role-based access control (RBAC)
  - Roles: `src/roles/entities/role.entity.ts`
  - Permissions: `src/permissions/entities/permission.entity.ts`
  - Role-Permission mappings: `src/permissions/entities/role-permission.entity.ts`
  - Permission guards: `src/auth/guards/permissions.guard.ts`
  - Custom decorators: `@RequirePermission()`, `@Public()`, `@CurrentUser()`

## Document Processing

**PDF Processing:**
- pdf-parse 2.4.5
  - Location: `src/knowledge-base/knowledge-base.service.ts` line 227
  - Purpose: Extract text from multi-page PDFs

**Word Document Processing:**
- mammoth 1.11.0
  - Location: `src/knowledge-base/knowledge-base.service.ts` line 269
  - Purpose: Extract raw text from DOCX files

**Audio Processing:**
- fluent-ffmpeg 2.1.3 with @ffmpeg-installer/ffmpeg 1.1.0
  - Location: `src/ai/audio-chunking.service.ts`
  - Purpose: Audio chunking, MP3 conversion, transcription preprocessing
  - Used with OpenAI Whisper for transcription

**Markdown/HTML Processing:**
- marked 15.0.12
  - Location: `src/proposals/proposals.service.ts`, `src/templates/templates.service.ts`
  - Purpose: Markdown to HTML conversion for proposals
  - Used with Handlebars 4.7.8 template engine

**Browser Automation:**
- puppeteer 24.34.0
  - Location: `src/templates/templates.service.ts`
  - Purpose: Generate proposal screenshots/PDFs from HTML templates
  - Headless browser automation for template previews

## Monitoring & Observability

**Logging:**
- NestJS built-in Logger
  - Used throughout services with structured prefixes: `[OPERATION]`, `[ACTION]`
  - Examples: `[TRANSCRIBE]`, `[INDEX]`, `[QUERY]`, `[CREATE]`, `[FIND_ONE]`

**Error Tracking:**
- Not detected - No Sentry or similar error tracking configured

**Analytics:**
- Not detected

## CI/CD & Deployment

**Hosting:**
- Not detected - No deployment configuration files found

**CI Pipeline:**
- Not detected - No `.github/workflows` or similar CI configuration

## Environment Configuration

**Development:**
- Required env vars: PORT, DB_*, REDIS_*, OPENAI_API_KEY, PINECONE_API_KEY, SUPABASE_*, JWT_SECRET
- Secrets location: `.env` file (currently committed to repo - CRITICAL security issue)
- Missing: .env.example file for developers

**Staging:**
- Not applicable

**Production:**
- Same as development (single environment configuration)
- Security concern: All production credentials in committed `.env` file

## API Documentation

**Swagger/OpenAPI:**
- Package: @nestjs/swagger 8.1.1
  - Location: `src/main.ts`
  - Endpoint: /api-docs
  - Bearer JWT authentication documented
  - All endpoints tagged with operation summaries and descriptions

## Webhooks & Callbacks

**Incoming:**
- Not detected

**Outgoing:**
- Not detected

---

*Integration audit: 2026-01-27*
*Update when adding/removing external services*
