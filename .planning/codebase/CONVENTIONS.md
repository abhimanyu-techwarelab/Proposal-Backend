# Coding Conventions

**Analysis Date:** 2026-01-14

## Naming Patterns

**Files:**
- kebab-case for all files (`proposals.service.ts`, `jwt-auth.guard.ts`)
- No test files present (*.test.ts, *.spec.ts)
- Standard suffixes: `.controller.ts`, `.service.ts`, `.module.ts`, `.entity.ts`, `.dto.ts`

**Functions:**
- camelCase for all functions (`create()`, `findAll()`, `findOne()`, `softDelete()`)
- No special prefix for async functions
- Descriptive names: `generateProposal()`, `createRetryProposal()`, `getNextVersionNumber()`

**Variables:**
- snake_case for database/DTO fields: `organization_id`, `user_id`, `is_deleted`, `created_at`
- camelCase for local variables: `organizationId`, `pageNum`, `startTime`
- Private members: `private readonly` with no underscore prefix

**Types:**
- PascalCase for classes: `ProposalsService`, `JwtAuthGuard`, `Proposal`
- PascalCase for interfaces: `JwtPayload`, `ProposalJobData`
- PascalCase for DTOs: `CreateUserDto`, `GenerateProposalDto`
- No I prefix for interfaces

## Code Style

**Formatting:**
- 2-space indentation
- Semicolons required on all statements
- Mixed quote style (single for NestJS imports, double in many files)
- No trailing commas observed

**Linting:**
- No ESLint configuration present
- No Prettier configuration present
- Style enforced by convention only

## Import Organization

**Order:**
1. NestJS core packages (`@nestjs/common`, `@nestjs/typeorm`)
2. External packages (`typeorm`, `bcrypt`, `openai`)
3. Internal modules (relative imports `./`, `../`)

**Grouping:**
- No explicit blank lines between groups
- Multiple imports from same package combined

**Path Aliases:**
- `@/*` maps to `src/*` (configured in `tsconfig.json`)
- Used sparingly in codebase

## Error Handling

**Patterns:**
- NestJS HTTP exceptions: `NotFoundException`, `BadRequestException`, `InternalServerErrorException`
- Services throw errors, controllers catch and transform
- Try-catch at service boundaries for external calls

**Error Types:**
- Throw on: Entity not found, validation failure, external service error
- Return null: When absence is expected (findOne with optional)
- Log before throwing: `this.logger.error(...); throw new Error()`

## Logging

**Framework:**
- NestJS built-in Logger: `private readonly logger = new Logger(ClassName.name)`
- Levels used: `log()`, `debug()`, `error()`

**Patterns:**
- Bracketed context prefix: `[CREATE]`, `[INIT]`, `[JWT]`, `[STEP 1]`
- Include relevant IDs: `this.logger.log(\`[CREATE] User created with ID: ${id}\`)`
- Log at service method entry/exit
- Log async job progress with steps

## Comments

**When to Comment:**
- Step-based comments in complex flows: `// 1. Fetch parent proposal`
- Business rule explanations: `// Create \"Super Admin\" role for the organization`
- Algorithm explanations rarely present

**JSDoc/TSDoc:**
- Not used for functions
- Swagger decorators used instead for API documentation

**TODO Comments:**
- Not observed in codebase

## Function Design

**Size:**
- Some large functions (proposal generation ~100 lines)
- Extraction into smaller methods not consistently applied

**Parameters:**
- DTOs for request data: `create(dto: CreateUserDto)`
- Destructuring used in service methods
- Repository injection via constructor

**Return Values:**
- Explicit returns with type annotations
- Async functions return Promises
- Repository operations return entities

## Module Design

**Exports:**
- Named exports for classes
- Each module exports its service
- Controllers not exported (used internally by NestJS)

**Barrel Files:**
- Not used (direct file imports)

**Circular Dependencies:**
- Avoided through module imports in `app.module.ts`
- ForwardRef not observed

## API Documentation

**Swagger Decorators:**
- Extensive use of Swagger decorators
- `@ApiProperty()` on all DTO fields
- `@ApiOperation()` on controller methods
- `@ApiResponse()` for response schemas
- `@ApiBearerAuth()` on protected routes
- `@ApiTags()` for route grouping

**Example:**
```typescript
@ApiProperty({
  description: 'User email address',
  example: 'user@example.com',
  type: String,
  format: 'email',
})
@IsEmail()
email: string;
```

## Database Patterns

**Entity Decorators:**
- `@Entity()` on all entity classes
- `@PrimaryGeneratedColumn('uuid')` for primary keys
- `@Column()` with type specifications
- `@CreateDateColumn()`, `@UpdateDateColumn()` for timestamps

**Soft Delete:**
- `is_deleted` boolean column pattern
- `is_deleted: false` in find queries
- No TypeORM soft delete feature used

**Repository Pattern:**
- TypeORM Repository injected via `@InjectRepository(Entity)`
- Standard methods: `create()`, `save()`, `findOne()`, `find()`

---

*Convention analysis: 2026-01-14*
*Update when patterns change*
