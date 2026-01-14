# Codebase Structure

**Analysis Date:** 2026-01-14

## Directory Layout

```
proposal-backend/
├── src/                    # Source code
│   ├── main.ts            # Application entry point
│   ├── app.module.ts      # Root module
│   ├── swagger-generator.ts # Swagger doc generator
│   ├── ai/                # AI/LLM integration
│   ├── auth/              # Authentication & authorization
│   ├── common/            # Shared utilities
│   ├── features/          # Feature flag system
│   ├── health/            # Health check endpoints
│   ├── knowledge-base/    # Vector DB & RAG
│   ├── organizations/     # Organization management
│   ├── permissions/       # Permission system
│   ├── plans/             # Subscription plans
│   ├── proposals/         # Core proposal feature
│   ├── queue/             # Job queue config
│   ├── roles/             # Role management
│   ├── seed/              # Database seeding
│   ├── storage/           # File storage
│   ├── tags/              # Content tagging
│   ├── templates/         # Proposal templates
│   └── users/             # User management
├── .planning/             # Project planning docs
├── migrations/            # Database migrations
├── package.json           # Project manifest
├── tsconfig.json          # TypeScript config
├── nest-cli.json          # NestJS CLI config
└── .env                   # Environment variables
```

## Directory Purposes

**src/proposals/**
- Purpose: Core proposal generation feature
- Contains: Controller, service, processor, entity, DTOs
- Key files: `proposals.service.ts` (707 lines), `proposal.processor.ts`
- Subdirectories: `dto/`, `entities/`, `processors/`

**src/ai/**
- Purpose: AI/LLM integration layer
- Contains: AI service wrapper, domain-specific agents, tools
- Key files: `ai.service.ts`, `agents/general-info.agent.ts`, `agents/scope.agent.ts`, `agents/timeline.agent.ts`
- Subdirectories: `agents/`, `tools/`

**src/auth/**
- Purpose: Authentication and authorization
- Contains: JWT strategy, guards, decorators
- Key files: `auth.service.ts`, `guards/jwt-auth.guard.ts`, `guards/permissions.guard.ts`
- Subdirectories: `decorators/`, `dto/`, `guards/`, `interfaces/`, `strategies/`

**src/knowledge-base/**
- Purpose: Vector database and RAG integration
- Contains: Pinecone integration, document chunking, embedding
- Key files: `knowledge-base.service.ts` (396 lines)
- Subdirectories: None

**src/storage/**
- Purpose: Cloud file storage abstraction
- Contains: Supabase S3 integration
- Key files: `storage.service.ts`, `storage.controller.ts`
- Subdirectories: `dto/`

**src/templates/**
- Purpose: Proposal template management and rendering
- Contains: Template CRUD, Handlebars rendering, PDF generation
- Key files: `templates.service.ts` (591 lines)
- Subdirectories: `dto/`, `entities/`

**src/organizations/**
- Purpose: Multi-tenant organization management
- Contains: Organization CRUD with auto role setup
- Key files: `organizations.service.ts` (278 lines)
- Subdirectories: `dto/`, `entities/`

**src/users/, src/roles/, src/permissions/**
- Purpose: User and RBAC management
- Contains: User CRUD, role CRUD, permission mappings
- Key files: `users.service.ts`, `roles.service.ts`, `permissions.service.ts`, `role-permissions.service.ts`

**src/queue/**
- Purpose: Job queue configuration
- Contains: BullMQ module setup with Redis
- Key files: `queue.module.ts`

**src/common/**
- Purpose: Shared utilities
- Contains: Data transformation, common utilities
- Key files: `data-transform.service.ts`, `utils.service.ts`

## Key File Locations

**Entry Points:**
- `src/main.ts` - Application bootstrap, CORS, Swagger setup
- `src/app.module.ts` - Root module, imports all features

**Configuration:**
- `tsconfig.json` - TypeScript compiler options
- `nest-cli.json` - NestJS CLI configuration
- `.env` - Environment variables (secrets, DB config)
- `package.json` - Dependencies and scripts

**Core Logic:**
- `src/proposals/proposals.service.ts` - Proposal business logic
- `src/proposals/processors/proposal.processor.ts` - Async job processor
- `src/ai/ai.service.ts` - OpenAI client wrapper
- `src/knowledge-base/knowledge-base.service.ts` - RAG implementation
- `src/templates/templates.service.ts` - Template rendering

**Authentication:**
- `src/auth/auth.service.ts` - Login, JWT creation, permission loading
- `src/auth/guards/jwt-auth.guard.ts` - Token validation
- `src/auth/guards/permissions.guard.ts` - Permission checking

**Database Entities:**
- `src/proposals/entities/proposal.entity.ts` - Proposal schema (50+ columns)
- `src/users/entities/user.entity.ts` - User schema
- `src/organizations/entities/organization.entity.ts` - Organization schema
- `src/templates/entities/template.entity.ts` - Template schema

**Testing:**
- No test files present in codebase

## Naming Conventions

**Files:**
- `kebab-case.ts` for all TypeScript files
- `*.controller.ts` - HTTP handlers
- `*.service.ts` - Business logic
- `*.module.ts` - NestJS modules
- `*.entity.ts` - Database entities
- `*.dto.ts` - Data transfer objects
- `*.guard.ts` - Route guards
- `*.decorator.ts` - Custom decorators
- `*.agent.ts` - AI agents
- `*.processor.ts` - Queue processors

**Directories:**
- lowercase for feature modules (e.g., `proposals/`, `users/`)
- Plural names for collections (e.g., `entities/`, `dto/`)
- Standard subdirectories: `dto/`, `entities/`, `guards/`, `decorators/`

**Special Patterns:**
- Feature module structure: `{name}.controller.ts`, `{name}.service.ts`, `{name}.module.ts`
- Entity files in `entities/` subdirectory
- DTOs in `dto/` subdirectory

## Where to Add New Code

**New Feature:**
- Primary code: `src/{feature-name}/`
- Controller: `src/{feature-name}/{feature-name}.controller.ts`
- Service: `src/{feature-name}/{feature-name}.service.ts`
- Module: `src/{feature-name}/{feature-name}.module.ts`
- Import module in `src/app.module.ts`

**New Entity:**
- Implementation: `src/{feature}/entities/{entity-name}.entity.ts`
- Add to TypeOrmModule.forRoot() entities array in `src/app.module.ts`

**New DTO:**
- Implementation: `src/{feature}/dto/{action}-{entity}.dto.ts`
- Example: `create-user.dto.ts`, `update-organization.dto.ts`

**New AI Agent:**
- Implementation: `src/ai/agents/{agent-name}.agent.ts`
- Register in `src/ai/ai.service.ts`

**New Guard/Decorator:**
- Guards: `src/auth/guards/{name}.guard.ts`
- Decorators: `src/auth/decorators/{name}.decorator.ts`

**Utilities:**
- Shared helpers: `src/common/{name}.service.ts`
- Type definitions: `src/{feature}/interfaces/{name}.interface.ts`

## Special Directories

**.planning/**
- Purpose: Project planning documentation
- Contains: Codebase analysis, roadmaps, plans
- Committed: Yes

**migrations/**
- Purpose: Database migration files
- Source: Manual or TypeORM generated
- Committed: Yes

**node_modules/**
- Purpose: npm dependencies
- Source: npm install
- Committed: No (.gitignore)

**dist/**
- Purpose: Compiled JavaScript output
- Source: nest build
- Committed: No (.gitignore)

---

*Structure analysis: 2026-01-14*
*Update when directory structure changes*
