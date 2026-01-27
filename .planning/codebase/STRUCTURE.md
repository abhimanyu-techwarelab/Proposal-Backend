# Codebase Structure

**Analysis Date:** 2026-01-27

## Directory Layout

```
Proposal-Backend/
├── src/                       # Application source code
│   ├── main.ts               # Server entry point
│   ├── app.module.ts         # Root module
│   ├── swagger-generator.ts  # API docs generator
│   ├── auth/                 # Authentication & authorization
│   ├── proposals/            # Core proposal feature
│   ├── users/                # User management
│   ├── organizations/        # Organization management
│   ├── roles/                # Role management
│   ├── permissions/          # Permission management
│   ├── templates/            # Template management
│   ├── storage/              # File storage (Supabase)
│   ├── ai/                   # AI/LLM services
│   ├── knowledge-base/       # Vector DB & parsing
│   ├── queue/                # Job queue config
│   ├── subscriptions/        # Subscription management
│   ├── plans/                # Service plans
│   ├── features/             # Feature flags
│   ├── dashboard/            # Analytics
│   ├── tags/                 # Content tagging
│   ├── seed/                 # Database seeding
│   ├── health/               # Health checks
│   └── common/               # Shared utilities
├── .env                      # Environment variables (committed - security issue)
├── .gitignore               # Git ignore patterns
├── nest-cli.json            # NestJS CLI config
├── package.json             # Dependencies
├── package-lock.json        # Dependency lockfile
├── table_schema.txt         # Database schema reference
└── tsconfig.json            # TypeScript config
```

## Directory Purposes

**src/**
- Purpose: All application source code
- Contains: TypeScript modules, controllers, services, entities
- Entry: `main.ts`, `app.module.ts`

**src/proposals/**
- Purpose: Core proposal generation feature
- Contains:
  - `proposals.module.ts` - Module configuration
  - `proposals.controller.ts` - API endpoints (1040 lines)
  - `proposals.service.ts` - Business logic (1411 lines)
  - `dto/` - Request/response DTOs
  - `entities/` - Proposal entity
  - `processors/` - BullMQ job processors (proposal.processor.ts, extraction.processor.ts)
  - `interfaces/` - TypeScript interfaces (extracted-fields.interface.ts)
- Key files:
  - Proposal generation, versioning, extraction, rendering

**src/auth/**
- Purpose: Authentication and authorization
- Contains:
  - `auth.module.ts`, `auth.controller.ts`, `auth.service.ts`
  - `guards/` - JwtAuthGuard, PermissionsGuard
  - `strategies/` - jwt.strategy.ts (Passport)
  - `decorators/` - @CurrentUser(), @RequirePermission(), @Public()
  - `interfaces/` - jwt-payload.interface.ts
  - `dto/` - login.dto.ts
- Key files: JWT generation, password validation, permission resolution

**src/users/**
- Purpose: User management
- Contains:
  - `users.module.ts`, `users.controller.ts`, `users.service.ts`
  - `entities/` - user.entity.ts
  - `dto/` - create-user.dto.ts, update-user.dto.ts
- Key files: User CRUD, password hashing, email validation

**src/organizations/**
- Purpose: Organization/tenant management
- Contains:
  - `organizations.module.ts`, `organizations.controller.ts`, `organizations.service.ts`
  - `entities/` - organization.entity.ts
  - `dto/` - create-organization.dto.ts, update-organization.dto.ts
- Key files: Multi-tenancy, organization CRUD

**src/roles/** and **src/permissions/**
- Purpose: RBAC (Role-Based Access Control)
- Contains:
  - Module, controller, service for each
  - `entities/` - role.entity.ts, permission.entity.ts, role-permission.entity.ts
  - `dto/` - Create/update DTOs
- Key files: Role-permission mappings, access control

**src/templates/**
- Purpose: Proposal template management
- Contains:
  - `templates.module.ts`, `templates.controller.ts`, `templates.service.ts`
  - `entities/` - template.entity.ts, template-tag.entity.ts
  - `dto/` - Template DTOs
- Key files: Handlebars rendering, template CRUD

**src/storage/**
- Purpose: File storage integration (Supabase)
- Contains:
  - `storage.module.ts`, `storage.controller.ts`, `storage.service.ts`
  - `dto/` - Storage operation DTOs
- Key files: File upload/download, signed URLs

**src/ai/**
- Purpose: AI/LLM integration
- Contains:
  - `ai.module.ts`, `ai.service.ts`, `audio-chunking.service.ts`
  - `agents/` - general-info.agent.ts, scope.agent.ts, timeline.agent.ts, field-extraction.agent.ts
  - `tools/` - LangChain tools
- Key files: OpenAI/LangChain orchestration, audio transcription

**src/knowledge-base/**
- Purpose: Vector database and document parsing
- Contains:
  - `knowledge-base.module.ts`, `knowledge-base.service.ts`
- Key files: Pinecone integration, PDF/DOCX parsing, text chunking

**src/queue/**
- Purpose: Job queue configuration
- Contains:
  - `queue.module.ts` - BullMQ setup
- Key files: Redis connection, queue registration

**src/subscriptions/, src/plans/, src/features/**
- Purpose: Subscription/billing management
- Contains: Standard module/controller/service/entity/dto structure per feature
- Key files: Subscription CRUD, plan management, feature flags

**src/dashboard/**
- Purpose: Analytics and insights
- Contains: dashboard.module.ts, dashboard.controller.ts, dashboard.service.ts, dto/
- Key files: Analytics queries

**src/tags/**
- Purpose: Content tagging
- Contains: tags.module.ts, tags.controller.ts, tags.service.ts, entities/tag.entity.ts, dto/
- Key files: Tag CRUD for templates/proposals

**src/seed/**
- Purpose: Database initialization and seeding
- Contains: seed.module.ts, seed.controller.ts, seed.service.ts
- Key files: Initial data population

**src/health/**
- Purpose: Health checks
- Contains: health.module.ts, health.controller.ts
- Key files: API health status

**src/common/**
- Purpose: Shared utilities
- Contains: common.module.ts, utils.service.ts, data-transform.service.ts
- Key files: General helpers, data transformation

## Key File Locations

**Entry Points:**
- `src/main.ts` - Server bootstrap, listens on port 3000
- `src/app.module.ts` - Root module, global config

**Configuration:**
- `tsconfig.json` - TypeScript compiler config (target: ES2021, module: CommonJS)
- `nest-cli.json` - NestJS CLI config
- `package.json` - Dependencies and npm scripts
- `.env` - Environment variables (SECURITY ISSUE: committed to repo)

**Core Logic:**
- `src/proposals/proposals.service.ts` - Proposal generation (1411 lines)
- `src/proposals/processors/proposal.processor.ts` - Async generation worker
- `src/proposals/processors/extraction.processor.ts` - Async extraction worker
- `src/auth/auth.service.ts` - Authentication logic
- `src/users/users.service.ts` - User management
- `src/ai/ai.service.ts` - AI orchestration
- `src/knowledge-base/knowledge-base.service.ts` - Vector DB operations

**Testing:**
- Not detected - No test files (*.spec.ts, *.test.ts) found
- `package.json` has empty test script

**Documentation:**
- `table_schema.txt` - Database schema reference in root
- Swagger/OpenAPI at `/api-docs` endpoint

## Naming Conventions

**Files:**
- Feature files: `feature-name.controller.ts`, `feature-name.service.ts`, `feature-name.module.ts`
- Entities: `entity-name.entity.ts` (e.g., `user.entity.ts`, `proposal.entity.ts`)
- DTOs: `action-entity.dto.ts` (e.g., `create-user.dto.ts`, `update-proposal.dto.ts`)
- Guards: `guard-name.guard.ts` (e.g., `jwt-auth.guard.ts`, `permissions.guard.ts`)
- Strategies: `strategy-name.strategy.ts` (e.g., `jwt.strategy.ts`)
- Processors: `processor-name.processor.ts` (e.g., `proposal.processor.ts`)
- Interfaces: `interface-name.interface.ts` (e.g., `jwt-payload.interface.ts`)
- Decorators: `decorator-name.decorator.ts` (e.g., `current-user.decorator.ts`)

**Directories:**
- kebab-case for all directories: `knowledge-base`, `role-permissions`, `audio-chunking`
- Plural names for features: `proposals`, `users`, `organizations`, `templates`
- Singular for infrastructure: `storage`, `queue`, `auth`, `seed`, `health`
- Standard subdirectories:
  - `dto/` - Data Transfer Objects
  - `entities/` - TypeORM database entities
  - `interfaces/` - TypeScript interfaces
  - `guards/` - Route guards
  - `strategies/` - Passport strategies
  - `decorators/` - Custom decorators
  - `processors/` - BullMQ job processors
  - `agents/` - AI agents
  - `tools/` - AI tools

## Where to Add New Code

**New Feature:**
- Primary code: `src/feature-name/` directory with:
  - `feature-name.module.ts`
  - `feature-name.controller.ts`
  - `feature-name.service.ts`
  - `dto/` subdirectory
  - `entities/` subdirectory (if persisted)
- Tests: Co-located `feature-name.service.spec.ts`, `feature-name.controller.spec.ts` (currently missing)
- Import: Add to `src/app.module.ts` imports array

**New Entity:**
- Implementation: `src/feature-name/entities/entity-name.entity.ts`
- TypeORM decorators: `@Entity()`, `@Column()`, `@PrimaryGeneratedColumn('uuid')`
- Register: Add to `TypeOrmModule.forFeature([EntityName])` in feature module

**New API Endpoint:**
- Definition: Method in existing `*.controller.ts`
- Decorators: `@Post()`, `@Get()`, `@Put()`, `@Delete()`, `@UseGuards()`
- Handler: Method calls service layer
- Documentation: `@ApiOperation()`, `@ApiResponse()` for Swagger

**New Background Job:**
- Queue setup: Add queue name to `src/queue/queue.module.ts`
- Processor: `src/feature-name/processors/processor-name.processor.ts`
- Pattern: Extend `WorkerHost`, implement `process(job: Job<DataType>)`
- Enqueue: Call `this.queue.add('job-name', data)` from service

**New AI Agent:**
- Implementation: `src/ai/agents/agent-name.agent.ts`
- Pattern: LangChain agent with system prompt and tools
- Register: Export from `src/ai/ai.module.ts`, use in AIService

**Utilities:**
- Shared helpers: `src/common/utils.service.ts`
- Type definitions: `src/common/interfaces/`

## Special Directories

**.env**
- Purpose: Environment variables (database credentials, API keys)
- Source: Local development configuration
- Committed: Yes (CRITICAL SECURITY ISSUE - all credentials exposed in repo)
- Should be: Gitignored with `.env.example` as template

**node_modules/**
- Purpose: Installed dependencies (491 directories)
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-01-27*
*Update when directory structure changes*
