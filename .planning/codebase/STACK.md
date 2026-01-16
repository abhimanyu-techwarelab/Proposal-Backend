# Technology Stack

**Analysis Date:** 2026-01-16

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code (`package.json`)

**Secondary:**
- JavaScript - Configuration files (nest-cli.json)
- SQL - PostgreSQL migrations (`migrations/` directory)

## Runtime

**Environment:**
- Node.js 18+ (required by NestJS 10.4.20)
- No `.nvmrc` file specified

**Package Manager:**
- npm 10.x
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- NestJS 10.4.20 - Web framework and dependency injection
  - `@nestjs/common`: ^10.4.20
  - `@nestjs/core`: ^10.4.20
  - `@nestjs/platform-express`: ^10.4.20

**Testing:**
- None configured - `package.json` test script returns error

**Build/Dev:**
- TypeScript 5.9.3 - Compilation to JavaScript (`tsconfig.json`)
- NestJS CLI 10.4.9 - Build and development tooling
- ts-node 10.9.2 - TypeScript execution without build step

## Key Dependencies

**Critical:**
- `openai`: ^6.15.0 - OpenAI API client for AI generation (`src/ai/ai.service.ts`, `src/knowledge-base/knowledge-base.service.ts`)
- `@langchain/openai`: ^0.6.17 - LangChain OpenAI integration
- `langchain`: ^0.3.37 - AI agent orchestration (`src/ai/agents/`)
- `@pinecone-database/pinecone`: ^6.1.3 - Vector database for knowledge base (`src/knowledge-base/knowledge-base.service.ts`)

**Infrastructure:**
- `typeorm`: ^0.3.28 - ORM for PostgreSQL (`src/app.module.ts`)
- `@nestjs/typeorm`: ^11.0.0 - NestJS TypeORM integration
- `pg`: ^8.16.3 - PostgreSQL client library
- `bullmq`: ^5.66.3 - Job queue for async processing (`src/queue/queue.module.ts`)
- `ioredis`: ^5.8.2 - Redis client for BullMQ
- `@supabase/supabase-js`: ^2.78.0 - File storage and auth (`src/storage/storage.service.ts`)

**Document Processing:**
- `pdf-parse`: ^2.4.5 - PDF text extraction (`src/knowledge-base/knowledge-base.service.ts`)
- `mammoth`: ^1.11.0 - DOCX file extraction (`src/knowledge-base/knowledge-base.service.ts`)
- `marked`: ^15.0.12 - Markdown to HTML conversion (`src/proposals/proposals.service.ts`, `src/templates/templates.service.ts`)
- `handlebars`: ^4.7.8 - Template rendering (`src/templates/templates.service.ts`)
- `puppeteer`: ^24.34.0 - HTML to PDF conversion (`src/templates/templates.service.ts`)

**Authentication:**
- `@nestjs/jwt`: ^11.0.2 - JWT token generation (`src/auth/auth.service.ts`)
- `@nestjs/passport`: ^11.0.5 - Authentication middleware
- `passport`: ^0.7.0 - Authentication framework
- `passport-jwt`: ^4.0.1 - JWT strategy
- `bcrypt`: ^6.0.0 - Password hashing (`src/users/users.service.ts`, `src/auth/auth.service.ts`)

## Configuration

**Environment:**
- Environment variables via `.env` file
- NestJS ConfigModule with `@nestjs/config`: ^4.0.2
- Configuration loaded in `src/app.module.ts`

**Build:**
- `tsconfig.json` - TypeScript compiler options (ES2021 target)
- `nest-cli.json` - NestJS CLI configuration

## Platform Requirements

**Development:**
- Any platform with Node.js 18+
- Docker recommended for PostgreSQL and Redis
- No external dependencies beyond npm packages

**Production:**
- Node.js runtime environment
- PostgreSQL database (external: postgres.techware.co.in:32805)
- Redis instance (external: 156.67.214.146:7379)
- OpenAI API access
- Pinecone API access
- Supabase project

---

*Stack analysis: 2026-01-16*
*Update after major dependency changes*
