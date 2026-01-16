# Codebase Concerns

**Analysis Date:** 2026-01-16

## Tech Debt

**Exposed Credentials in Repository:**
- Issue: `.env` file with live credentials committed to git
- Files: `.env` at project root
- Keys at risk: DB_PASSWORD (`Golden_123`), OPENAI_API_KEY, SUPABASE keys, PINECONE_API_KEY, JWT_SECRET
- Impact: Complete infrastructure compromise if repository is accessed
- Fix approach: IMMEDIATE - Rotate all credentials, add `.env` to `.gitignore`, create `.env.example`

**Large Service Files:**
- Issue: Several service files exceed 500+ lines
- Files:
  - `src/proposals/proposals.service.ts` - 707 lines
  - `src/templates/templates.service.ts` - 591 lines
  - `src/knowledge-base/knowledge-base.service.ts` - 396 lines
- Impact: Difficult to maintain, test, and understand
- Fix approach: Extract logical units into separate services

**N+1 Query Patterns:**
- Issue: Loop with database queries for parent_id chain traversal
- Files: `src/proposals/proposals.service.ts` - `getNextVersionNumber()` and `getLatestNamespaceInChain()` functions
- Impact: O(n) database queries for deeply nested proposals
- Fix approach: Use recursive CTE or fetch entire chain in one query

**Missing .env.example:**
- Issue: No template for required environment variables
- Impact: Difficult onboarding, unclear requirements
- Fix approach: Create `.env.example` with placeholder values

**Typo in Field Name:**
- Issue: Field named `team-structure-min-experiance` (misspelled "experience")
- Files: `src/ai/agents/general-info.agent.ts` line 14, `src/proposals/entities/proposal.entity.ts` line 47
- Impact: Confusing API contracts; technical debt in field naming
- Fix approach: Database migration to rename column

## Known Bugs

**No known bugs documented.**
- Note: Without test coverage, bugs may exist undetected
- Recommendation: Add comprehensive test suite

## Security Considerations

**CRITICAL: Exposed Credentials:**
- Risk: Live database password, API keys, and secrets committed to repository
- Files: `.env`
- Current mitigation: None
- Recommendations: Immediate credential rotation, add to `.gitignore`

**CORS Configuration:**
- Risk: `app.enableCors({ origin: true, credentials: true })` allows all origins
- File: `src/main.ts`
- Current mitigation: None
- Recommendations: Restrict to specific trusted origins via CORS_ORIGIN env var

**HTML Rendering Without Sanitization:**
- Risk: XSS vulnerability when rendering user data in templates
- Files: `src/proposals/proposals.service.ts` lines 807-810 (`marked.parse()`)
- Current mitigation: None
- Recommendations: Configure marked with XSS protection, sanitize user input

**Missing Input Validation:**
- Risk: Minimal DTO validation decorators, no bounds checking on pagination
- Files: `src/proposals/dto/generate-proposal.dto.ts`, `src/proposals/proposals.controller.ts` lines 233-256
- Current mitigation: Basic class-validator decorators
- Recommendations: Add comprehensive validation (array lengths, numeric ranges, URL formats)

**No Rate Limiting:**
- Risk: Expensive AI operations can be called unlimited times
- Files: `src/proposals/proposals.controller.ts` line 73 (`generateProposal` endpoint)
- Current mitigation: None
- Recommendations: Add @nestjs/throttler for rate limiting

## Performance Bottlenecks

**N+1 Permission Loading on Login:**
- Problem: `getUserPermissions()` and `checkAdminAccess()` both fetch role permissions separately
- Files: `src/auth/auth.service.ts` lines 47-50, 68-85, 87-105
- Measurement: 2 separate database queries on every login
- Cause: Sequential calls to both methods
- Improvement path: Consolidate into single query

**Proposal Version Chain Queries:**
- Problem: Multiple sequential database queries for version tracking
- File: `src/proposals/proposals.service.ts` lines 207-242
- Measurement: O(n) queries where n = chain depth
- Cause: While loop with findOne() calls to trace parent chain
- Improvement path: Recursive CTE query or materialized path pattern

**Missing Database Indexes:**
- Problem: Heavy queries on unindexed columns
- Files: Queries throughout codebase
- Example: JOIN on `subscription.organization_id` in `src/proposals/proposals.service.ts` line 674
- Impact: Slow queries as data grows
- Recommendations: Add indexes on `proposal.status`, `proposal.parent_id`, `subscription.organization_id`

## Fragile Areas

**Unhandled JSON Parsing in AI Agents:**
- Files: `src/ai/agents/scope.agent.ts` lines 131, 193; `src/ai/agents/general-info.agent.ts` line 109; `src/ai/agents/timeline.agent.ts` line 103
- Why fragile: Direct `JSON.parse()` calls without try-catch blocks
- Common failures: Malformed JSON from OpenAI causes unhandled error
- Safe modification: Wrap in try-catch with fallback
- Test coverage: Not tested

**Proposal Processor:**
- File: `src/proposals/processors/proposal.processor.ts`
- Why fragile: Large try-catch block with multiple async operations
- Common failures: Any failure in chain (audio, documents, AI) fails entire job
- Safe modification: Add more granular error handling per step
- Test coverage: Not tested

**Template Rendering:**
- File: `src/templates/templates.service.ts` lines 94-100 (`preserveLineBreaks()`)
- Why fragile: Regex without input length validation (ReDoS risk)
- Common failures: Template syntax errors, Puppeteer browser issues
- Safe modification: Add input validation, rate limiting
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

**Handlebars Security Advisory:**
- Package: `handlebars@4.7.8`
- Risk: Known security advisories but actively used
- Impact: Potential template injection vulnerabilities
- Migration plan: Update to latest version, review template security

**Puppeteer Bundle Size:**
- Package: `puppeteer@24.34.0`
- Risk: Large dependency (~300MB with Chromium)
- Impact: Slow deployments, large container images
- Migration plan: Consider puppeteer-core or alternative PDF libraries

## Missing Critical Features

**Test Suite:**
- Problem: Zero test coverage (test script returns error)
- Current workaround: Manual testing only
- Blocks: Confidence in refactoring, regression detection
- Implementation complexity: Medium (standard NestJS testing setup)

**Error Monitoring:**
- Problem: No external error tracking (Sentry, etc.)
- Current workaround: Log inspection
- Blocks: Proactive error detection
- Implementation complexity: Low (add Sentry SDK)

**Missing Audit Logging:**
- Problem: Sensitive operations (approve, reject, delete) don't log audit trail
- Files: `src/proposals/proposals.service.ts` lines 732-753, 824-836, 882-894
- Impact: No way to track who performed operations or when
- Implementation complexity: Low (add audit log table and service)

## Test Coverage Gaps

**Critical Untested Areas:**
- `src/proposals/proposals.service.ts` - Core proposal generation logic (707 lines)
- `src/auth/auth.service.ts` - Authentication and authorization
- `src/ai/agents/*.agent.ts` - AI response handling and JSON parsing
- `src/knowledge-base/knowledge-base.service.ts` - RAG implementation
- `src/templates/templates.service.ts` - Template rendering (591 lines)

**Risk Level:** CRITICAL
- Any changes to these files could introduce regressions
- No automated verification of functionality
- Business-critical logic completely untested

## TypeScript Type Safety

**Excessive 'any' Usage:**
- Count: 35+ instances across codebase
- Risk: Defeats TypeScript's type safety benefits
- Fix: Create proper interfaces for complex types

**Weak DTO Typing:**
- Files: `src/proposals/dto/generate-proposal.dto.ts`
- Issue: `milestones?: object[]`, `team_members?: object[]` - no type definitions
- Fix: Define `Milestone` and `TeamMember` interfaces

---

*Concerns audit: 2026-01-16*
*Update as issues are fixed or new ones discovered*
