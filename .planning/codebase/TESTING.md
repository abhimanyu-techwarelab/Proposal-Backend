# Testing Patterns

**Analysis Date:** 2026-01-14

## Test Framework

**Runner:**
- Not implemented
- `package.json` script: `"test": "echo \"Error: no test specified\" && exit 1"`

**Assertion Library:**
- Not configured

**Run Commands:**
```bash
npm test                              # Placeholder - prints error
# No actual test commands available
```

## Test File Organization

**Location:**
- No test files found in `src/` directory
- No `__tests__/` directories
- No `*.spec.ts` or `*.test.ts` files

**Naming:**
- Not established (no tests exist)

**Structure:**
```
src/
  proposals/
    proposals.service.ts      # No accompanying test file
    proposals.controller.ts   # No accompanying test file
```

## Test Structure

**Suite Organization:**
- Not established

**Patterns:**
- Not established

## Mocking

**Framework:**
- Not configured

**Patterns:**
- Not established

**What to Mock (recommended):**
- External APIs: OpenAI, Pinecone, Supabase
- Database operations: TypeORM repositories
- Redis/BullMQ: Job queue operations

**What NOT to Mock (recommended):**
- Pure utility functions in `src/common/`
- DTO validation logic

## Fixtures and Factories

**Test Data:**
- Not established

**Location:**
- No fixtures directory

## Coverage

**Requirements:**
- Not enforced
- No coverage configuration

**Configuration:**
- Not set up

**View Coverage:**
```bash
# Not available
```

## Test Types

**Unit Tests:**
- Not implemented
- Critical functions needing tests:
  - `src/proposals/proposals.service.ts` - `generateProposal()`, `createRetryProposal()`
  - `src/auth/auth.service.ts` - `login()`, `getUserPermissions()`
  - `src/ai/agents/*.agent.ts` - AI agent execution
  - `src/knowledge-base/knowledge-base.service.ts` - document processing

**Integration Tests:**
- Not implemented
- Recommended coverage:
  - Proposal generation flow (API -> Queue -> AI -> Database)
  - Authentication flow (login -> JWT -> protected routes)
  - Template rendering (data -> Handlebars -> HTML/PDF)

**E2E Tests:**
- Not implemented
- Recommended coverage:
  - Full proposal generation lifecycle
  - User onboarding flow
  - Organization setup flow

## Common Patterns

**Async Testing:**
- Not established

**Error Testing:**
- Not established

**Recommended Test Setup:**
```typescript
// Example pattern for future implementation
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('ProposalsService', () => {
  let service: ProposalsService;
  let mockRepository: jest.Mocked<Repository<Proposal>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalsService,
        {
          provide: getRepositoryToken(Proposal),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProposalsService>(ProposalsService);
  });

  it('should create a proposal', async () => {
    // test implementation
  });
});
```

## Recommendations

**Priority 1 - Unit Tests:**
1. Auth service (login, permissions)
2. Proposals service (generation, retry logic)
3. AI agents (response parsing)
4. Knowledge base (chunking, embedding)

**Priority 2 - Integration Tests:**
1. Proposal generation flow
2. Template rendering
3. Storage operations

**Priority 3 - E2E Tests:**
1. Full proposal lifecycle
2. User flows

**Suggested Test Framework:**
- Jest (NestJS default) or Vitest
- @nestjs/testing for DI support
- Supertest for HTTP testing

---

*Testing analysis: 2026-01-14*
*Update when test patterns established*
