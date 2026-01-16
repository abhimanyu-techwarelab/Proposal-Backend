# Architecture

**Analysis Date:** 2026-01-16

## Pattern Overview

**Overall:** Modular Monolith with Layered Architecture (NestJS)

**Key Characteristics:**
- Domain-driven module organization
- Dependency injection throughout
- Async job processing for AI operations
- Multi-tenant RBAC system
- RESTful API with Swagger documentation

## Layers

**Controller Layer:**
- Purpose: HTTP request handling, validation, response formatting
- Contains: Route handlers with decorators (`@Post`, `@Get`, `@Delete`)
- Location: `src/*/\*.controller.ts`
- Depends on: Service layer
- Used by: HTTP clients via API routes

**Service Layer:**
- Purpose: Business logic implementation
- Contains: Domain operations, orchestration, data transformations
- Location: `src/*/\*.service.ts`
- Depends on: Repository layer, other services
- Used by: Controllers, job processors

**Data Access Layer:**
- Purpose: Database interactions via TypeORM
- Contains: Entity definitions, repository operations
- Location: `src/*/entities/\*.entity.ts`
- Depends on: PostgreSQL database
- Used by: Service layer

**Infrastructure Layer:**
- Purpose: External service integrations
- Contains: AI agents, storage, queue processors
- Location: `src/ai/`, `src/storage/`, `src/queue/`, `src/knowledge-base/`
- Depends on: OpenAI, Pinecone, Supabase, Redis
- Used by: Service layer

## Data Flow

**HTTP Request Flow:**

1. Request enters controller (e.g., `ProposalsController.generateProposal()`)
2. JWT token validated by `JwtAuthGuard` (`src/auth/guards/jwt-auth.guard.ts`)
3. Permissions checked by `PermissionsGuard` (`src/auth/guards/permissions.guard.ts`)
4. DTO validation via `ValidationPipe` (configured in `src/main.ts`)
5. Service method invoked with validated data
6. Service may queue async job or perform direct operations
7. Response returned to client

**Proposal Generation Flow (Async):**

1. API receives `POST /product/proposals/generate` with `GenerateProposalDto`
2. `ProposalsService.generateProposal()` creates proposal record with status "processing"
3. Job queued to BullMQ ("proposal-generation" queue)
4. `ProposalProcessor` executes asynchronously (`src/proposals/processors/proposal.processor.ts`):
   - Downloads audio files from Supabase
   - Transcribes audio via OpenAI Whisper
   - Indexes documents in Pinecone for RAG
   - Executes AI agents: GeneralInfoAgent, ScopeAgent, TimelineAgent
   - Updates proposal with generated content
5. Client polls `GET /product/proposals/{id}` to check status
6. When complete, renders HTML via `GET /product/proposals/{id}/render`

**State Management:**
- Database-backed: All state persisted in PostgreSQL
- Queue-based: Redis for job queue state
- Stateless requests: No in-memory session state

## Key Abstractions

**Service:**
- Purpose: Encapsulate business logic for a domain
- Examples: `src/proposals/proposals.service.ts`, `src/auth/auth.service.ts`, `src/templates/templates.service.ts`
- Pattern: Singleton (NestJS injectable)

**Entity:**
- Purpose: Database schema with TypeORM decorators
- Examples: `src/proposals/entities/proposal.entity.ts`, `src/users/entities/user.entity.ts`
- Pattern: Active Record via TypeORM Repository

**Agent:**
- Purpose: AI-powered content generation for specific domains
- Examples: `src/ai/agents/general-info.agent.ts`, `src/ai/agents/scope.agent.ts`, `src/ai/agents/timeline.agent.ts`
- Pattern: Strategy (different agents for different content types)

**Guard:**
- Purpose: Route protection and authorization
- Examples: `src/auth/guards/jwt-auth.guard.ts`, `src/auth/guards/permissions.guard.ts`
- Pattern: Decorator-based interception

**DTO:**
- Purpose: Data validation and transformation
- Examples: `src/proposals/dto/generate-proposal.dto.ts`, `src/users/dto/create-user.dto.ts`
- Pattern: Class-based validation with decorators

## Entry Points

**Main Entry:**
- Location: `src/main.ts`
- Triggers: `npm run start`
- Responsibilities: Bootstrap NestJS app, configure CORS, setup Swagger, listen on port

**Root Module:**
- Location: `src/app.module.ts`
- Triggers: Loaded by NestFactory
- Responsibilities: Import all feature modules, configure TypeORM, configure BullMQ

**Job Processor:**
- Location: `src/proposals/processors/proposal.processor.ts`
- Triggers: BullMQ job queued
- Responsibilities: Execute AI-powered proposal generation

## Error Handling

**Strategy:** Throw NestJS HTTP exceptions, catch at controller boundary

**Patterns:**
- Controllers use `NotFoundException`, `BadRequestException`, `InternalServerErrorException`
- Services throw errors, controllers catch and transform
- Job processor has try-catch with error status update
- Validation errors returned as 400 with details

## Cross-Cutting Concerns

**Logging:**
- NestJS Logger used consistently
- Format: `[CONTEXT] Message` (e.g., `[CREATE]`, `[INIT]`, `[JWT]`)
- Location: Every service has `private readonly logger = new Logger(ClassName.name)`

**Validation:**
- Global ValidationPipe configured in `src/main.ts`
- DTOs use class-validator decorators
- Whitelist mode enabled (strips unknown properties)

**Authentication:**
- JWT-based via Passport (`src/auth/strategies/jwt.strategy.ts`)
- Token validation via `JwtAuthGuard`
- User extraction via `@CurrentUser()` decorator

**Authorization:**
- Role-based permissions system
- Permission check via `PermissionsGuard`
- Required permissions via `@RequirePermission()` decorator

---

*Architecture analysis: 2026-01-16*
*Update when major patterns change*
