# Codebase Concerns

**Analysis Date:** 2026-01-14

## Tech Debt

**Large Service Files:**
- Issue: Several service files exceed 500+ lines
- Files:
  - `src/proposals/proposals.service.ts` - 707 lines
  - `src/templates/templates.service.ts` - 591 lines
  - `src/knowledge-base/knowledge-base.service.ts` - 396 lines
  - `src/organizations/organizations.service.ts` - 278 lines
- Impact: Difficult to maintain, test, and understand
- Fix approach: Extract logical units into separate services

**N+1 Query Patterns:**
- Issue: Loop with database queries for parent_id chain traversal
- Files:
  - `src/proposals/proposals.service.ts` - `getNextVersionNumber()` function
  - `src/proposals/proposals.service.ts` - `getLatestNamespaceInChain()` function
- Impact: Multiple DB queries for deeply nested proposals
- Fix approach: Use recursive CTE or fetch entire chain in one query

**Missing .env.example:**
- Issue: No template for required environment variables
- Impact: Difficult onboarding, unclear requirements
- Fix approach: Create `.env.example` with placeholder values

**Mixed Quote Styles:**
- Issue: Inconsistent use of single and double quotes
- Files: Throughout codebase
- Impact: Code style inconsistency
- Fix approach: Add Prettier configuration, enforce single quotes

## Known Bugs

**No known bugs documented.**
- Note: Without test coverage, bugs may exist undetected
- Recommendation: Add comprehensive test suite

## Security Considerations

**CORS Configuration:**
- Risk: `app.enableCors({ origin: true, credentials: true })` allows all origins
- File: `src/main.ts`
- Current mitigation: None
- Recommendations: Restrict to specific trusted origins via `CORS_ORIGIN` env var

**Secrets in .env:**
- Risk: If `.env` is committed to git, secrets are exposed
- File: `.env`
- Current mitigation: File exists but should verify `.gitignore`
- Recommendations: Ensure `.env` in `.gitignore`, create `.env.example`, rotate any exposed keys

**HTML Rendering Without Sanitization:**
- Risk: XSS vulnerability when rendering user data in templates
- File: `src/proposals/proposals.service.ts` - `renderTeamTableRows()` function
- Current mitigation: None
- Recommendations: Use HTML sanitization library (DOMPurify or similar)

**Admin Role Check:**
- Risk: Ensure admin endpoints are properly protected
- File: `src/auth/guards/permissions.guard.ts`
- Current mitigation: Permission guard in place
- Recommendations: Verify all admin routes use `@RequirePermission()` decorator

## Performance Bottlenecks

**Proposal Version Chain Queries:**
- Problem: Multiple sequential database queries for version tracking
- File: `src/proposals/proposals.service.ts`
- Measurement: O(n) queries where n = chain depth
- Cause: While loop with `findOne()` calls
- Improvement path: Recursive CTE query or materialized path pattern

**AI Agent Execution:**
- Problem: Sequential execution of 3 AI agents
- File: `src/proposals/processors/proposal.processor.ts`
- Measurement: 3 separate OpenAI API calls in sequence
- Cause: Designed for sequential execution
- Improvement path: Parallelize independent agents, use Promise.all()

## Fragile Areas

**Proposal Processor:**
- File: `src/proposals/processors/proposal.processor.ts`
- Why fragile: Large try-catch block with multiple async operations
- Common failures: Any failure in chain (audio, documents, AI) fails entire job
- Safe modification: Add more granular error handling per step
- Test coverage: Not tested

**AI Agent JSON Parsing:**
- Files: `src/ai/agents/general-info.agent.ts`, `src/ai/agents/scope.agent.ts`, `src/ai/agents/timeline.agent.ts`
- Why fragile: `JSON.parse()` without try-catch on OpenAI responses
- Common failures: Malformed JSON from AI causes unhandled error
- Safe modification: Wrap in try-catch with fallback
- Test coverage: Not tested

**Template Rendering:**
- File: `src/templates/templates.service.ts`
- Why fragile: Complex Handlebars helper registration, PDF generation with Puppeteer
- Common failures: Template syntax errors, Puppeteer browser issues
- Safe modification: Add validation layer before rendering
- Test coverage: Not tested

## Scaling Limits

**Queue Processing:**
- Current capacity: Single worker processing jobs sequentially
- Limit: Throughput limited by AI API rate limits and processing time
- Symptoms at limit: Job queue backlog, slow proposal generation
- Scaling path: Add more workers, implement rate limiting awareness

**Database Connections:**
- Current capacity: TypeORM default connection pool
- Limit: Not explicitly configured
- Scaling path: Configure connection pool size via TypeORM options

## Dependencies at Risk

**No Major Dependency Risks Identified.**
- TypeORM 0.3.x is stable
- NestJS 10.x is actively maintained
- OpenAI SDK is actively maintained

## Missing Critical Features

**Test Suite:**
- Problem: Zero test coverage
- Current workaround: Manual testing only
- Blocks: Confidence in refactoring, regression detection
- Implementation complexity: Medium (standard NestJS testing setup)

**Error Monitoring:**
- Problem: No external error tracking (Sentry, etc.)
- Current workaround: Log inspection
- Blocks: Proactive error detection
- Implementation complexity: Low (add Sentry SDK)

**API Rate Limiting:**
- Problem: No rate limiting on API endpoints
- Current workaround: None
- Blocks: Protection against abuse
- Implementation complexity: Low (@nestjs/throttler)

## Test Coverage Gaps

**Critical Untested Areas:**
- `src/proposals/proposals.service.ts` - Core proposal generation logic
- `src/auth/auth.service.ts` - Authentication and authorization
- `src/ai/agents/*.agent.ts` - AI response handling
- `src/knowledge-base/knowledge-base.service.ts` - RAG implementation
- `src/templates/templates.service.ts` - Template rendering

**Risk Level:** HIGH
- Any changes to these files could introduce regressions
- No automated verification of functionality

## TypeScript Type Safety

**Excessive 'any' Usage:**
- Count: 35+ instances across codebase
- Files: Various service files, DTOs
- Risk: Defeats TypeScript's type safety benefits
- Fix: Create proper interfaces for complex types

**Weak DTO Typing:**
- Files: `src/proposals/dto/generate-proposal.dto.ts`
- Issue: `milestones?: object[]`, `team_members?: object[]`
- Fix: Define `Milestone` and `TeamMember` interfaces

---

*Concerns audit: 2026-01-14*
*Update as issues are fixed or new ones discovered*
