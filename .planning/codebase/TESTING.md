# Testing Patterns

**Analysis Date:** 2026-01-27

## Test Framework

**Runner:**
- NOT CONFIGURED
- `package.json` test script: `"test": "echo \"Error: no test specified\" && exit 1"`
- No Jest, Vitest, Mocha, or other test runner installed

**Assertion Library:**
- Not applicable (no tests exist)

**Run Commands:**
```bash
npm test                              # Currently fails with error message
```

## Test File Organization

**Location:**
- No test files found in codebase
- Glob search for `*.test.ts` and `*.spec.ts` in `src/` returned zero results

**Naming:**
- Expected pattern (NestJS standard): `*.spec.ts` co-located with source files
- Example structure (NOT PRESENT):
  ```
  src/
    users/
      users.service.ts
      users.service.spec.ts  ← MISSING
      users.controller.ts
      users.controller.spec.ts  ← MISSING
  ```

**Structure:**
- Not applicable (no tests exist)

## Test Structure

**Suite Organization:**
- Not applicable (no test framework configured)

**NestJS Standard Pattern (Not Implemented):**
```typescript
describe('UsersService', () => {
  describe('create', () => {
    it('should create a user with valid data', async () => {
      // arrange
      const dto = { email: 'test@example.com', ... };

      // act
      const result = await service.create(dto);

      // assert
      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
    });

    it('should throw ConflictException for duplicate email', async () => {
      // test error case
    });
  });
});
```

## Mocking

**Framework:**
- Not applicable (no test framework)

**What Should Be Mocked (Recommended):**
- External APIs: OpenAI, Pinecone, Supabase
- File system: FFmpeg operations, file uploads/downloads
- Database: TypeORM repositories
- Redis: BullMQ queue operations
- Time/dates for deterministic testing

**What NOT to Mock:**
- Pure functions and utilities
- Internal business logic (test actual behavior)
- TypeScript types

## Fixtures and Factories

**Test Data:**
- Not applicable (no tests exist)

**Recommended Pattern:**
```typescript
// Factory function for test users
function createTestUser(overrides?: Partial<User>): User {
  return {
    id: 'test-uuid',
    email: 'test@example.com',
    name: 'Test User',
    organization_id: 'org-uuid',
    ...overrides
  };
}
```

**Location:**
- Recommended: Factory functions in test files or `tests/fixtures/`

## Coverage

**Requirements:**
- No coverage target set
- 0% current coverage (no tests exist)

**Configuration:**
- Not configured (no coverage tool installed)

**View Coverage:**
- Not applicable

## Test Types

**Unit Tests:**
- NOT PRESENT
- Should test: Individual services, guards, decorators in isolation
- Priority files for unit tests:
  - `src/auth/auth.service.ts` - Login, JWT generation, password validation
  - `src/users/users.service.ts` - User CRUD with transactions
  - `src/proposals/proposals.service.ts` - Proposal business logic
  - `src/subscriptions/subscriptions.service.ts` - Subscription management

**Integration Tests:**
- NOT PRESENT
- Should test: Controllers with services, database operations
- Priority integration tests:
  - `src/users/users.controller.ts` - Full HTTP request/response cycle
  - `src/proposals/proposals.controller.ts` - Proposal API endpoints
  - `src/auth/auth.controller.ts` - Authentication flow

**E2E Tests:**
- NOT PRESENT
- Should test: Full application flows, queue processing
- Priority E2E tests:
  - Proposal generation workflow (create → queue → process → complete)
  - Authentication flow (login → JWT → protected route)
  - Field extraction workflow

## Testable Code Structure

**Entity Files (13 total):**
- `src/users/entities/user.entity.ts`
- `src/proposals/entities/proposal.entity.ts`
- `src/roles/entities/role.entity.ts`
- `src/permissions/entities/permission.entity.ts`
- `src/organizations/entities/organization.entity.ts`
- `src/templates/entities/template.entity.ts`
- `src/subscriptions/entities/subscription.entity.ts`
- `src/plans/entities/plan.entity.ts`
- `src/features/entities/feature.entity.ts`
- `src/tags/entities/tag.entity.ts`
- Plus junction tables

**Service Classes (Ready for Testing):**
- `src/users/users.service.ts` - User CRUD, validation
- `src/auth/auth.service.ts` - Authentication, JWT, permissions
- `src/proposals/proposals.service.ts` - Complex proposal logic (1411 lines - high priority)
- `src/organizations/organizations.service.ts` - Organization management
- `src/templates/templates.service.ts` - Template rendering
- `src/subscriptions/subscriptions.service.ts` - Subscription logic
- `src/roles/roles.service.ts` - Role management
- `src/permissions/permissions.service.ts` - Permission management
- `src/storage/storage.service.ts` - File operations
- `src/ai/ai.service.ts` - AI orchestration
- `src/knowledge-base/knowledge-base.service.ts` - Vector DB operations
- `src/seed/seed.service.ts` - Database seeding

**Queue Processors (Async Testing Needed):**
- `src/proposals/processors/proposal.processor.ts` - BullMQ job processor
- `src/proposals/processors/extraction.processor.ts` - Extraction processor

**Guards (Unit Testing):**
- `src/auth/guards/jwt-auth.guard.ts`
- `src/auth/guards/permissions.guard.ts`

## Testing Candidates by Priority

**Priority 1 - Core Security & Auth:**
1. `AuthService.login()` - Password validation, JWT generation
2. `AuthService.validateUser()` - Email/password check
3. `JwtAuthGuard` - JWT token validation
4. `PermissionsGuard` - Permission checking logic

**Priority 2 - Critical Business Logic:**
1. `ProposalsService.generateProposal()` - Complex async workflow
2. `UsersService.create()` - Transaction handling, validation
3. `SubscriptionsService.findActiveSubscription()` - Subscription status logic
4. `SeedService.seed()` - Database initialization

**Priority 3 - Data Validation:**
1. All DTOs with class-validator decorators:
   - `CreateUserDto` - Email, password validation
   - `GenerateProposalDto` - UUID, array validation
   - `CreateOrganizationDto` - Field validation
2. Entity relationships and constraints

**Priority 4 - Integration:**
1. Proposal generation pipeline (end-to-end)
2. Queue processors (`src/proposals/processors/`)
3. External service integration (OpenAI, Pinecone, Supabase)
4. Storage operations (`src/storage/storage.service.ts`)

**Priority 5 - Controllers:**
1. `UsersController` - User API endpoints
2. `ProposalsController` - Proposal API endpoints
3. `AuthController` - Authentication endpoints

## Common Patterns (Recommended)

**Async Testing:**
```typescript
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});
```

**Error Testing:**
```typescript
it('should throw ConflictException on duplicate email', async () => {
  await expect(service.create(dto)).rejects.toThrow(ConflictException);
});
```

**Mocking TypeORM Repository:**
```typescript
const mockRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};

const module = await Test.createTestingModule({
  providers: [
    UsersService,
    { provide: getRepositoryToken(User), useValue: mockRepository },
  ],
}).compile();
```

**Snapshot Testing:**
- Not recommended for this codebase (prefer explicit assertions)

## Development Dependencies for Testing Setup

**Available in package.json:**
- `@nestjs/cli`: ^10.4.9 (has built-in test scaffolding)
- `@nestjs/schematics`: ^11.0.9 (can generate test templates)
- `typescript`: ^5.9.3
- `ts-node`: ^10.9.2
- `@types/node`: ^25.0.3

**Recommended to Add:**
- Jest 29.x (NestJS standard)
- @nestjs/testing (testing utilities)
- @types/jest
- ts-jest (TypeScript support)
- supertest (E2E testing)
- @types/supertest

## Recommended Next Steps

1. **Install Testing Framework:**
   ```bash
   npm install --save-dev @nestjs/testing jest @types/jest ts-jest supertest @types/supertest
   ```

2. **Configure Jest:**
   - Create `jest.config.js`
   - Configure TypeScript support via ts-jest
   - Set coverage thresholds

3. **Update package.json Scripts:**
   ```json
   {
     "test": "jest",
     "test:watch": "jest --watch",
     "test:cov": "jest --coverage",
     "test:e2e": "jest --config ./test/jest-e2e.json"
   }
   ```

4. **Generate Test Files:**
   ```bash
   nest generate service users --spec  # Generates users.service.spec.ts
   ```

5. **Write Tests in Priority Order:**
   - Start with `AuthService` and `JwtAuthGuard`
   - Add `UsersService` tests
   - Gradually increase coverage

---

*Testing analysis: 2026-01-27*
*Update when test patterns are established*
