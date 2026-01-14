# Technology Stack

**Analysis Date:** 2026-01-14

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code (88 source files in `src/`)

**Secondary:**
- JavaScript - Build scripts, config files
- SQL - Database schema and queries (PostgreSQL)

## Runtime

**Environment:**
- Node.js (not specified in .nvmrc - lockfileVersion 3 indicates npm v9+ support)
- No browser runtime (API server only)

**Package Manager:**
- npm 10.x (inferred from lockfileVersion 3)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- NestJS 10.4.20 - Web framework (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`)
- Express 5.0.6 - HTTP server (via NestJS)

**Testing:**
- Not implemented - `package.json` has placeholder test script

**Build/Dev:**
- NestJS CLI 10.4.9 - Build tool (`nest-cli.json`)
- ts-node 10.9.2 - TypeScript execution
- tsconfig-paths 4.2.0 - Path resolution

## Key Dependencies

**Critical:**
- TypeORM 0.3.28 - Database ORM (`src/app.module.ts`)
- pg 8.16.3 - PostgreSQL driver (`package.json`)
- OpenAI 6.15.0 - LLM API client (`src/ai/ai.service.ts`)
- @pinecone-database/pinecone 6.1.3 - Vector database (`src/knowledge-base/knowledge-base.service.ts`)

**AI & LangChain:**
- @langchain/core 0.3.80 - LangChain utilities
- @langchain/openai 0.6.17 - LangChain OpenAI integration
- langchain 0.3.37 - LangChain framework

**Infrastructure:**
- @supabase/supabase-js 2.78.0 - Cloud storage (`src/storage/storage.service.ts`)
- bullmq 5.66.3 - Job queue (`src/queue/queue.module.ts`)
- ioredis 5.8.2 - Redis client (`src/app.module.ts`)
- passport 0.7.0 + passport-jwt 4.0.1 - Authentication (`src/auth/`)
- @nestjs/jwt 11.0.2 - JWT token management
- bcrypt 6.0.0 - Password hashing (`src/auth/auth.service.ts`)

**Document Processing:**
- pdf-parse 2.4.5 - PDF text extraction (`src/knowledge-base/knowledge-base.service.ts`)
- mammoth 1.11.0 - DOCX text extraction
- marked 15.0.12 - Markdown parsing (`src/templates/templates.service.ts`)
- handlebars 4.7.8 - Template compilation
- puppeteer 24.34.0 - PDF generation from HTML

**API & Validation:**
- @nestjs/swagger 8.1.1 - API documentation (`src/main.ts`)
- class-validator 0.14.3 - DTO validation
- class-transformer 0.5.1 - DTO transformation
- axios 1.13.2 - HTTP client

## Configuration

**Environment:**
- `.env` files - environment variables
- Required vars: `PORT`, `DB_*`, `REDIS_*`, `SUPABASE_*`, `OPENAI_API_KEY`, `PINECONE_*`, `JWT_*`
- Missing `.env.example` template

**Build:**
- `tsconfig.json` - TypeScript config (ES2021 target, CommonJS module)
- `nest-cli.json` - NestJS CLI configuration
- Path aliases: `@/*` maps to `src/*`

## Platform Requirements

**Development:**
- Any platform with Node.js
- PostgreSQL database access
- Redis server for job queue

**Production:**
- Docker container or Node.js runtime
- PostgreSQL 14+ database
- Redis server
- Environment variables for secrets

---

*Stack analysis: 2026-01-14*
*Update after major dependency changes*
