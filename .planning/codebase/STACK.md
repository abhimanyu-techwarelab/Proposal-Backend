# Technology Stack

**Analysis Date:** 2026-01-27

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code (`package.json`, `tsconfig.json`)

**Secondary:**
- JavaScript - Configuration files, debug utilities (`debug-jwt.js`, `nest-cli.json`)

## Runtime

**Environment:**
- Node.js (no explicit version constraint, uses @types/node ^25.0.3) - `package.json`
- ES2021 target compilation - `tsconfig.json`

**Package Manager:**
- npm with package-lock.json - `package-lock.json`
- NestJS CLI 10.4.9 for build and development - `package.json`

## Frameworks

**Core:**
- NestJS 10.4.20 - Full-stack Node.js framework with dependency injection - `package.json`, `src/app.module.ts`
- Express platform (@nestjs/platform-express) - HTTP server - `package.json`

**Testing:**
- No test framework configured - `package.json` (test script: "echo \"Error: no test specified\" && exit 1")

**Build/Dev:**
- TypeScript 5.9.3 - Compilation to JavaScript - `package.json`, `tsconfig.json`
- ts-node 10.9.2 - TypeScript execution without build step - `package.json`
- tsconfig-paths 4.2.0 - Path alias resolution (@/*) - `package.json`
- NestJS Schematics 11.0.9 - Code generation - `package.json`

## Key Dependencies

**Critical:**
- TypeORM 0.3.28 - Database ORM for PostgreSQL - `src/app.module.ts`, `package.json`
- @nestjs/jwt - JWT token generation/validation - `src/auth/auth.module.ts`, `package.json`
- @nestjs/passport - Authentication framework integration - `src/auth/auth.module.ts`, `package.json`
- passport-jwt - JWT strategy for Passport - `package.json`
- bcrypt 6.0.0 - Password hashing - `src/auth/auth.service.ts`, `package.json`
- openai 6.15.0 - AI-powered proposal generation - `src/ai/ai.service.ts`, `package.json`
- @pinecone-database/pinecone 6.1.3 - Vector database for semantic search - `src/knowledge-base/knowledge-base.service.ts`, `package.json`
- @supabase/supabase-js 2.78.0 - Cloud storage - `src/storage/storage.service.ts`, `package.json`

**Infrastructure:**
- BullMQ 5.66.3 - Job queue for async processing - `src/queue/queue.module.ts`, `package.json`
- @nestjs/bullmq - NestJS integration for BullMQ - `package.json`
- ioredis 5.8.2 - Redis client for job queues - `package.json`
- class-validator 0.14.3 - DTO validation - `package.json`
- class-transformer 0.5.1 - DTO transformation - `package.json`
- @nestjs/config - Environment variable management - `src/app.module.ts`, `package.json`
- @nestjs/swagger 8.1.1 - API documentation - `src/main.ts`, `package.json`

**AI & Document Processing:**
- @langchain/core 0.3.80 - AI agent orchestration - `package.json`
- @langchain/openai 0.6.17 - LangChain OpenAI integration - `package.json`
- puppeteer 24.34.0 - HTML to PDF conversion - `src/templates/templates.service.ts`, `package.json`
- handlebars 4.7.8 - Template rendering - `src/templates/templates.service.ts`, `package.json`
- marked 15.0.12 - Markdown to HTML conversion - `src/templates/templates.service.ts`, `package.json`
- pdf-parse 2.4.5 - PDF text extraction - `src/knowledge-base/knowledge-base.service.ts`, `package.json`
- mammoth 1.11.0 - DOCX text extraction - `src/knowledge-base/knowledge-base.service.ts`, `package.json`
- @ffmpeg-installer/ffmpeg 1.1.0 - Audio processing - `src/ai/audio-chunking.service.ts`, `package.json`
- fluent-ffmpeg 2.1.3 - FFmpeg wrapper - `src/ai/audio-chunking.service.ts`, `package.json`

**Utilities:**
- axios 1.13.2 - HTTP client - `src/storage/storage.service.ts`, `package.json`
- uuid 9.0.1 - Unique identifier generation - `package.json`
- RxJS 7.8.2 - Reactive programming (NestJS core dependency) - `package.json`

## Configuration

**Environment:**
- `.env` file with environment variables - `src/app.module.ts`, `.env`
- @nestjs/config ConfigModule for env management
- Key variables: DATABASE_URL, JWT_SECRET, OPENAI_API_KEY, PINECONE_API_KEY, SUPABASE_URL, REDIS_HOST

**Build:**
- `tsconfig.json` - TypeScript compiler options (ES2021 target, CommonJS modules, strict null checks)
- `nest-cli.json` - NestJS CLI configuration
- Path alias: `@/*` maps to `src/*`

## Platform Requirements

**Development:**
- Linux/macOS/Windows (Node.js compatible)
- PostgreSQL database server
- Redis server for job queues
- FFmpeg for audio processing

**Production:**
- PostgreSQL database: postgres.techware.co.in:32805 - `.env`
- Redis server: 156.67.214.146:7379 - `.env`
- External services: OpenAI API, Pinecone, Supabase Storage
- Node.js runtime environment
- Port 3000 (configurable via PORT env var) - `src/main.ts`

---

*Stack analysis: 2026-01-27*
*Update after major dependency changes*
