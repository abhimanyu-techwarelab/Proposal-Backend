# Coding Conventions

**Analysis Date:** 2026-01-27

## Naming Patterns

**Files:**
- kebab-case for all files: `user.entity.ts`, `create-user.dto.ts`, `jwt-auth.guard.ts`
- Test files: Not applicable (no tests exist - `*.test.ts`, `*.spec.ts` would be co-located with source)
- Dot-separated suffixes: `.entity.ts`, `.dto.ts`, `.service.ts`, `.controller.ts`, `.module.ts`, `.guard.ts`, `.strategy.ts`, `.processor.ts`, `.interface.ts`, `.decorator.ts`

**Functions:**
- camelCase for all functions: `findAll()`, `findOne()`, `softDelete()`, `generateProposal()`, `createNewProposal()`
- No special prefix for async functions (just use `async` keyword)
- Event handlers: handleEventName pattern (if applicable)
- Private methods: No underscore prefix (rely on TypeScript `private` keyword)

**Variables:**
- camelCase for local variables: `organizationId`, `pageNum`, `limitNum`, `startTime`, `currentUser`
- Constants: UPPER_SNAKE_CASE for module-level constants: `DEFAULT_FREE_PLAN_ID` (`src/subscriptions/subscriptions.service.ts` line 8)
- Database column names: snake_case (TypeORM entities): `password_hash`, `is_deleted`, `created_at`, `updated_at`, `organization_id`, `role_id`, `client_name`

**Types:**
- Interfaces: PascalCase, no I prefix: `User`, `JwtPayload`, `ExtractedFields` (not `IUser`)
- Type aliases: PascalCase: `UserConfig`, `ResponseData`, `MergedProposalData`
- Enums: PascalCase for name, UPPER_CASE for values (if used): `Status.PENDING`, `Status.COMPLETED`

## Code Style

**Formatting:**
- Tool: Not configured (no .prettierrc or .eslintrc found)
- Line length: Generally 80-100 characters
- Quotes: Single quotes (`'`) for strings and imports
- Template literals (backticks) for interpolation and multi-line strings
- Semicolons: Required (all statements end with `;`)
- Indentation: 2 spaces (consistent across all files)

**Examples:**
- `src/users/users.service.ts` - Single quotes on lines 53, 58
- `src/users/users.controller.ts` lines 1-13 - Multi-line import destructuring
- `src/auth/auth.service.ts` - Template literals for logging

**Linting:**
- Tool: Not configured (no .eslintrc or eslint.config.js found)
- Rules: Relies on developer discipline
- TypeScript compiler enforces some patterns via `tsconfig.json`:
  - `strictNullChecks: true`
  - `noImplicitAny: false` (allows implicit any - relaxed)
  - `experimentalDecorators: true`
  - `emitDecoratorMetadata: true`

## Import Organization

**Order:**
1. External packages (NestJS, TypeORM, etc.)
2. Internal modules by type (entities, services, DTOs)
3. Relative imports (., ..)

**Grouping:**
- No enforced blank lines between groups (varies by file)
- Generally alphabetical within groups

**Example from `src/users/users.controller.ts`:**
```typescript
import { Injectable, Logger, ConflictException, ... } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
```

**Path Aliases:**
- `@/` maps to `src/` (configured in `tsconfig.json`)
- Not widely used in codebase (relative imports preferred)

## Error Handling

**Patterns:**
- Throw exceptions in services, catch at boundaries (controllers/processors)
- NestJS built-in exceptions: `ConflictException`, `NotFoundException`, `BadRequestException`, `UnauthorizedException`, `HttpException`
- Examples: `src/users/users.service.ts` lines 34-36, 44-46, 152-154
- Async: Use try/catch in services, no .catch() chains preferred

**Error Types:**
- Throw on invalid input: `throw new BadRequestException('Invalid data')`
- Throw on not found: `throw new NotFoundException('User not found')`
- Throw on conflicts: `throw new ConflictException('Email already exists')`
- Log before throwing: `this.logger.error('[CREATE] Failed...', error)`

**Error Messages:**
- Include context: entity name, operation, reason
- Example: `User with email ${email} already exists`
- Example: `User with id ${id} not found`

## Logging

**Framework:**
- NestJS built-in Logger: `new Logger(ClassName.name)`
- Instantiated in constructor: `private readonly logger = new Logger(UsersService.name);`

**Patterns:**
- Format: `[OPERATION] Message` or `[ACTION] Details`
- Levels: `log()`, `warn()`, `error()`, `debug()` (no trace)
- Template literals for interpolation: ``this.logger.log(`[CREATE] Creating user: ${dto.email}`)``

**Examples from `src/users/users.service.ts`:**
- Line 23: ``this.logger.log(`[INIT] UsersService initialized`)``
- Line 27: ``this.logger.log(`[CREATE] Creating user: ${dto.email}`)``
- Line 145: ``this.logger.log(`[FIND_ONE] Fetching user: ${id}`)``

**When to Log:**
- Service initialization: `[INIT]`
- Start of operations: `[CREATE]`, `[UPDATE]`, `[DELETE]`, `[FIND_ONE]`
- Completion: `[SUCCESS]`, `[COMPLETE]`
- Warnings: Non-fatal issues
- Errors: Failures with error object
- Not in utility functions (only at service boundaries)

## Comments

**When to Comment:**
- Explain why, not what (code should be self-documenting)
- Document business rules: `// Users must verify email within 24 hours`
- Explain non-obvious algorithms or workarounds
- Mark temporary code: `// TODO: Fix race condition`
- Avoid obvious comments: `// increment counter`

**JSDoc/TSDoc:**
- Used for public methods in services
- Format: Multi-line JSDoc blocks with description
- Example from `src/subscriptions/subscriptions.service.ts`:
  ```typescript
  /**
   * Find an active subscription by organization ID
   * Active means: status is 'active', 'trialing', or 'past_due'
   * AND current_period_end is in the future OR null (lifetime subscription)
   */
  ```
- Not required for simple getters/setters or self-explanatory methods

**TODO Comments:**
- Format: `// TODO: description` (no username, using git blame)
- Link to issue if exists: `// TODO: Fix race condition (issue #123)`

## Function Design

**Size:**
- Keep under 50-100 lines where possible
- Large services exist (proposals.service.ts is 1411 lines - needs refactoring)
- Extract helpers for complex logic

**Parameters:**
- Destructure DTOs in parameter list: `function process({ id, name }: ProcessParams)`
- Use DTOs for 3+ parameters: `create(dto: CreateUserDto)`
- TypeORM repositories injected via constructor

**Return Values:**
- Explicit return statements
- Return early for guard clauses
- Async functions return Promise<T>
- Example: `async findOne(id: string): Promise<User>`

## Module Design

**Exports:**
- Named exports only (no default exports)
- Export services from modules: `exports: [UsersService]`
- Export entities for TypeORM: `TypeOrmModule.forFeature([User])`

**Module Pattern:**
- Each feature has dedicated module: `users.module.ts`, `proposals.module.ts`
- Module imports dependencies: `imports: [TypeOrmModule, StorageModule]`
- Module provides services: `providers: [UsersService]`
- Module exposes public API: `exports: [UsersService]`

**Barrel Files:**
- Not used (no index.ts re-exports)
- Direct imports preferred: `import { User } from './entities/user.entity'`

## NestJS-Specific Patterns

**Decorator Usage:**
- Class decorators: `@Injectable()`, `@Module()`, `@Controller()`, `@Entity()`
- Method decorators: `@Post()`, `@Get()`, `@Put()`, `@Delete()`, `@UseGuards()`
- Parameter decorators: `@Body()`, `@Query()`, `@Param()`, `@CurrentUser()`
- Property decorators: `@ApiProperty()`, `@IsNotEmpty()`, `@IsEmail()`, `@Column()`

**Dependency Injection:**
- Constructor injection only (no property injection)
- Use decorators: `@InjectRepository(User)`, `@InjectDataSource()`
- Example:
  ```typescript
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectDataSource() private dataSource: DataSource,
  ) {}
  ```

**DTO Validation:**
- class-validator decorators on DTO properties
- Common: `@IsString()`, `@IsEmail()`, `@IsUUID()`, `@IsNotEmpty()`, `@IsOptional()`
- Swagger: `@ApiProperty()`, `@ApiPropertyOptional()`
- Example: `src/roles/dto/create-role.dto.ts`, `src/proposals/dto/generate-proposal.dto.ts`

**TypeORM Entities:**
- Decorators: `@Entity()`, `@Column()`, `@PrimaryGeneratedColumn('uuid')`, `@CreateDateColumn()`, `@UpdateDateColumn()`
- Soft deletes: `is_deleted` boolean column (no `@DeleteDateColumn()`)
- Naming: snake_case for database columns, camelCase for class properties
- Example: `src/users/entities/user.entity.ts`

**Transactions:**
- Use `DataSource.transaction()` for atomic operations
- Example: `src/users/users.service.ts` lines 50-71
- Pattern: `await this.dataSource.transaction(async (manager) => { ... })`

---

*Convention analysis: 2026-01-27*
*Update when patterns change*
