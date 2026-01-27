# Technology Stack

**Analysis Date:** 2026-01-27

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code (`package.json`, `tsconfig.json`)

**Secondary:**
- JavaScript - Configuration files, npm scripts

## Runtime

**Environment:**
- Node.js v20.19.6
- No .nvmrc file (version managed externally)

**Package Manager:**
- npm 10.8.2
- Lockfile: `package-lock.json` present (491 node_modules directories)

## Frameworks

**Core:**
- NestJS 10.4.20 - Backend framework with modular architecture (`package.json`, `src/app.module.ts`)
- Express 5.0.6 - HTTP server (via @nestjs/platform-express)

**Testing:**
- Not detected - No test framework configured
- `package.json` shows: `"test": "echo \"Error: no test specified\" && exit 1"`

**Build/Dev:**
- TypeScript compiler 5.9.3 with target ES2021
- NestJS CLI 10.4.9 for building
- ts-node 10.9.2 - TypeScript execution

## Key Dependencies

**Critical:**
- `@nestjs/typeorm 11.0.0` - TypeORM integration for database access (`src/app.module.ts`)
- `typeorm 0.3.28` - ORM for PostgreSQL
- `@nestjs/bullmq 11.0.4` - Job queue for async processing (`src/queue/queue.module.ts`)
- `bullmq 5.66.3` - Redis-based queue worker
- `@nestjs/jwt 11.0.2` - JWT authentication (`src/auth/auth.service.ts`)
- `@nestjs/passport 11.0.5` - Passport integration for authentication
- `openai 6.15.0` - Direct OpenAI API client (`src/ai/ai.service.ts`)
- `@langchain/openai 0.6.17` - LangChain OpenAI integration
- `langchain 0.3.37` - AI orchestration framework

**Infrastructure:**
- `@supabase/supabase-js 2.78.0` - File storage client (`src/storage/storage.service.ts`)
- `@pinecone-database/pinecone 6.1.3` - Vector database (`src/knowledge-base/knowledge-base.service.ts`)
- `ioredis 5.8.2` - Redis client for caching and queues
- `axios 1.13.2` - HTTP client for external API calls
- `bcrypt 6.0.0` - Password hashing (`src/auth/auth.service.ts`)

**Document Processing:**
- `pdf-parse 2.4.5` - PDF text extraction (`src/knowledge-base/knowledge-base.service.ts`)
- `mammoth 1.11.0` - DOCX text extraction
- `fluent-ffmpeg 2.1.3` - Audio processing (`src/ai/audio-chunking.service.ts`)
- `@ffmpeg-installer/ffmpeg 1.1.0` - FFmpeg binary
- `marked 15.0.12` - Markdown to HTML conversion (`src/proposals/proposals.service.ts`)
- `handlebars 4.7.8` - Template engine
- `puppeteer 24.34.0` - Headless browser for PDF generation (`src/templates/templates.service.ts`)

**Validation:**
- `class-validator 0.14.3` - DTO validation
- `class-transformer 0.5.1` - DTO serialization
- `passport-jwt 4.0.1` - JWT strategy

## Configuration

**Environment:**
- `.env` file with environment variables (currently committed to repo - security concern)
- ConfigService from @nestjs/config for runtime configuration (`src/app.module.ts`)
- Global configuration module with forRoot pattern

**Build:**
- `tsconfig.json` - TypeScript compiler options
  - Target: ES2021
  - Module: CommonJS
  - Path aliases: `@/*` maps to `src/*`
  - Decorators enabled for NestJS

## Platform Requirements

**Development:**
- Any platform with Node.js 20.x
- PostgreSQL 12+ database access
- Redis instance for queue management

**Production:**
- Node.js 20.19.6
- PostgreSQL database (currently: postgres.techware.co.in:32805)
- Redis (currently: 156.67.214.146:7379)
- Supabase for file storage
- OpenAI API access
- Pinecone vector database access

---

*Stack analysis: 2026-01-27*
*Update after major dependency changes*
