# Architecture

**Analysis Date:** 2026-01-27

## Pattern Overview

**Overall:** Feature-based modular monolith with NestJS framework

**Key Characteristics:**
- Single executable backend server
- Feature/domain-driven module organization
- Async job processing with BullMQ
- Stateless HTTP API with JWT authentication
- AI-powered proposal generation pipeline

## Layers

**Controller Layer (API/HTTP):**
- Purpose: Handle HTTP requests, validation, response formatting
- Contains: REST endpoints with Swagger documentation
- Key files:
  - `src/proposals/proposals.controller.ts` - Proposals API
  - `src/auth/auth.controller.ts` - Authentication
  - `src/users/users.controller.ts` - User management
  - `src/organizations/organizations.controller.ts` - Organizations
  - `src/templates/templates.controller.ts` - Templates
  - `src/subscriptions/subscriptions.controller.ts` - Subscriptions
  - Plus 10+ other feature controllers
- Depends on: Service layer
- Used by: HTTP clients (frontend, mobile, external APIs)

**Service Layer (Business Logic):**
- Purpose: Core business logic, orchestration, data validation
- Contains: Injectable services with business rules
- Key services:
  - `src/proposals/proposals.service.ts` - Proposal CRUD, generation orchestration (1411 lines)
  - `src/auth/auth.service.ts` - Login, JWT generation, permission resolution
  - `src/users/users.service.ts` - User CRUD operations
  - `src/organizations/organizations.service.ts` - Organization management, role seeding
  - `src/templates/templates.service.ts` - Template rendering with Handlebars
  - `src/subscriptions/subscriptions.service.ts` - Subscription/billing logic
- Depends on: Data access layer (TypeORM repositories), Infrastructure services
- Used by: Controllers, Job processors

**Infrastructure/Integration Layer:**
- Purpose: External service integration, technical concerns
- Contains:
  - `src/ai/ai.service.ts` - OpenAI/LangChain integration
  - `src/knowledge-base/knowledge-base.service.ts` - Pinecone vector DB, document parsing
  - `src/storage/storage.service.ts` - Supabase file storage
  - `src/ai/audio-chunking.service.ts` - Audio processing with FFmpeg
  - `src/common/utils.service.ts` - General utilities
  - `src/common/data-transform.service.ts` - Data transformation
- Depends on: External APIs (OpenAI, Pinecone, Supabase)
- Used by: Service layer

**Data Access Layer:**
- Purpose: Database operations, entity management
- Contains: TypeORM entities and repositories
- Pattern: Repository pattern via TypeORM `@InjectRepository()`
- Entities:
  - `src/users/entities/user.entity.ts`
  - `src/proposals/entities/proposal.entity.ts`
  - `src/organizations/entities/organization.entity.ts`
  - `src/roles/entities/role.entity.ts`
  - `src/permissions/entities/permission.entity.ts`
  - `src/templates/entities/template.entity.ts`
  - `src/subscriptions/entities/subscription.entity.ts`
  - `src/plans/entities/plan.entity.ts`
  - `src/features/entities/feature.entity.ts`
  - `src/tags/entities/tag.entity.ts`
  - Plus junction tables
- Depends on: PostgreSQL database
- Used by: Service layer

**Queue/Background Job Layer:**
- Purpose: Async processing of long-running operations
- Contains: BullMQ job processors
- Key processors:
  - `src/proposals/processors/proposal.processor.ts` - Async proposal generation
  - `src/proposals/processors/extraction.processor.ts` - Field extraction from documents/audio
- Depends on: Service layer, Redis
- Used by: Service layer (job enqueuing)

## Data Flow

**Typical HTTP Request Flow:**

1. Client sends HTTP request → Controller endpoint
2. `JwtAuthGuard` validates JWT token (`src/auth/guards/jwt-auth.guard.ts`)
3. `PermissionsGuard` checks user permissions (`src/auth/guards/permissions.guard.ts`)
4. `@CurrentUser()` decorator extracts user/org context
5. `ValidationPipe` enforces DTO constraints
6. Controller calls Service method
7. Service executes business logic, queries database via TypeORM
8. Service returns result to Controller
9. Controller sends HTTP response to Client

**Proposal Generation Workflow (Async):**

```
POST /product/proposals/generate
    ↓
ProposalsController.generateProposal()
    ↓
ProposalsService.generateProposal()
    ├→ Create proposal record (status: 'processing')
    └→ Enqueue job to 'proposal-generation' queue (BullMQ)
    ↓
ProposalProcessor.process() [Background worker]
    ├→ Step 1: Retrieve proposal from PostgreSQL
    ├→ Step 2: Create/reuse Pinecone namespace
    ├→ Step 3a: Process audio files
    │   └→ Download → FFmpeg chunk → Whisper transcribe → Pinecone index
    ├→ Step 3b: Process documents
    │   └→ Download → Parse (PDF/DOCX) → Pinecone index
    ├→ Step 4: Execute AI agents in parallel
    │   ├→ GeneralInfoAgent (titles, summaries)
    │   ├→ ScopeAgent (scope of work)
    │   ├→ TimelineAgent (timeline/milestones)
    │   └→ BudgetAgent (financial details)
    ├→ Step 5: Merge AI results, render Handlebars template
    └→ Step 6: Update proposal status to 'completed'

GET /product/proposals/{id}/status
    ↓
ProposalsService.getProposalResult()
    └→ Query PostgreSQL for status/result
```

**Field Extraction Workflow:**

```
POST /product/proposals/extract-fields
    ↓
ProposalsController.extractFieldsFromUploads()
    ↓
ProposalsService.extractFieldsFromUploads()
    └→ Enqueue job to 'field-extraction' queue
    ↓
ExtractionProcessor.process() [Background worker]
    ├→ Download documents/audio from signed URLs
    ├→ Parse documents → Extract text (PDF/DOCX)
    ├→ Transcribe audio → FFmpeg + Whisper
    ├→ Combine all text content
    ├→ Invoke FieldExtractionAgent (OpenAI)
    └→ Return extracted field data with confidence scores
```

**State Management:**
- Stateless HTTP layer (JWT for authentication)
- Database-backed persistence (PostgreSQL)
- Queue state in Redis (BullMQ job tracking)
- No in-memory application state

## Key Abstractions

**Module Pattern:**
- Purpose: Feature/domain boundaries with dependency injection
- Examples:
  - ProposalsModule - `src/proposals/proposals.module.ts`
  - AuthModule - `src/auth/auth.module.ts`
  - UsersModule - `src/users/users.module.ts`
  - OrganizationsModule - `src/organizations/organizations.module.ts`
- Pattern: Each module declares imports, controllers, providers, exports
- Dependency Example: ProposalsModule imports StorageModule, KnowledgeBaseModule, AIModule

**Service Pattern:**
- Purpose: Encapsulate business logic with dependency injection
- Examples:
  - `ProposalsService` - 1411 lines, handles proposal CRUD, versioning, generation
  - `AuthService` - Login, JWT generation, permission resolution
  - `UsersService` - User CRUD with transactions
- Pattern: `@Injectable()` decorator, constructor injection
- Used by: Controllers, other services, job processors

**Queue/Job Processing:**
- Purpose: Async long-running operations
- Pattern: BullMQ WorkerHost processors
- Job data types: ProposalJobData, ExtractionJobData
- Retry: 3 attempts with exponential backoff
- Progress tracking via job data updates

**Guard Pattern:**
- Purpose: Protect routes with authentication/authorization
- Examples:
  - `JwtAuthGuard` - `src/auth/guards/jwt-auth.guard.ts`
  - `PermissionsGuard` - `src/auth/guards/permissions.guard.ts`
- Pattern: `@UseGuards()` decorator on controllers/methods
- Execution: Guards run before route handler

**Decorator Pattern:**
- Purpose: Metadata extraction and route customization
- Examples:
  - `@CurrentUser()` - Extract user from JWT payload (`src/auth/decorators/current-user.decorator.ts`)
  - `@RequirePermission()` - Specify required permissions
  - `@Public()` - Bypass authentication
- Used by: Controllers

**DTO Pattern:**
- Purpose: Request validation and type safety
- Examples:
  - `CreateUserDto` - `src/users/dto/create-user.dto.ts`
  - `GenerateProposalDto` - `src/proposals/dto/generate-proposal.dto.ts`
  - `LoginDto` - `src/auth/dto/login.dto.ts`
- Pattern: class-validator decorators (`@IsString()`, `@IsEmail()`, `@IsUUID()`)
- Validation: Global ValidationPipe with whitelist, transform

## Entry Points

**Main Server:**
- Location: `src/main.ts`
- Triggers: `npm run start`
- Responsibilities:
  - Bootstrap NestFactory application
  - Configure CORS (currently: origin: true - security concern)
  - Setup ValidationPipe globally
  - Configure Swagger documentation at /api-docs
  - Listen on port 3000 (or PORT env var)

**App Module:**
- Location: `src/app.module.ts`
- Triggers: Imported by main.ts
- Responsibilities:
  - Global configuration (ConfigModule.forRoot())
  - TypeORM database connection setup
  - BullModule queue setup
  - Import all feature modules

**CLI/Scripts:**
- Not detected - No dedicated CLI entry points

## Error Handling

**Strategy:** Exception-based with NestJS built-in filters

**Patterns:**
- Services throw exceptions: `ConflictException`, `NotFoundException`, `BadRequestException`, `UnauthorizedException`
- Examples: `src/users/users.service.ts` lines 34-36, 44-46, 152-154
- Guards throw `UnauthorizedException` on auth failure
- Controllers don't catch exceptions (let NestJS handle with HTTP status codes)

**Logging:**
- NestJS Logger with context (`[OPERATION]` prefixes)
- Error logs include context: `this.logger.error('[CREATE] Failed to create user', error)`

## Cross-Cutting Concerns

**Logging:**
- Pattern: `private readonly logger = new Logger(ClassName.name);`
- Format: `[OPERATION] Message` or `[ACTION] Details`
- Examples: `[CREATE]`, `[FIND_ONE]`, `[TRANSCRIBE]`, `[INDEX]`, `[QUERY]`
- Location: All services and controllers

**Validation:**
- Strategy: DTO-based with class-validator
- Global ValidationPipe in `src/main.ts`:
  - whitelist: true (strip unknown properties)
  - transform: true (auto-transform to DTO types)
  - forbidNonWhitelisted: true (reject unknown properties)
- Examples: `src/proposals/dto/generate-proposal.dto.ts`, `src/users/dto/create-user.dto.ts`

**Authentication:**
- Strategy: JWT with Passport
- Flow: JwtStrategy extracts payload → JwtAuthGuard validates → @CurrentUser() decorator provides user
- Location: `src/auth/strategies/jwt.strategy.ts`, `src/auth/guards/jwt-auth.guard.ts`
- Public routes: `@Public()` decorator bypasses guard

**Authorization:**
- Strategy: Role-based permissions
- Flow: PermissionsGuard checks user.role_id → fetches permissions → validates required permissions
- Location: `src/auth/guards/permissions.guard.ts`
- Decorator: `@RequirePermission('permission_key')`

**Transactions:**
- Strategy: TypeORM DataSource.transaction() for atomic operations
- Example: `src/users/users.service.ts` lines 50-71 (user creation with role assignment)

---

*Architecture analysis: 2026-01-27*
*Update when major patterns change*
