# Hatara Studio Full Architecture Audit Report (Phase 4.5)

## 1. Executive Summary
This report documents a read-only, full-stack architecture audit of Hatara Studio (RenderVideo app). The audit evaluated the application against robust enterprise standards: concurrency, idempotency, data consistency, security, and component coupling. Overall, the system has a strong foundation with isolated workers, abstract provider interfaces, and a robust BillingEngine. However, several critical vulnerabilities were discovered regarding Worker Race Conditions, Hardcoded Secrets, and Row Level Security (RLS) policies.

## 2. Architecture Map
**Verified Flow (AI Image):**
- Client -> NextJS API (/api/images) -> INSERT image_jobs (PENDING)
- Image Worker (Polling) -> RPC claim_next_image_job (5m lease)
- Image Worker -> Billing Engine: executeAndCharge()
- Billing Engine -> Reserve Credits (Idempotent)
- Image Worker -> Provider: Generate Images
- Image Worker -> R2 Storage: Upload outputs
- Billing Engine -> Commit Credits
- Image Worker -> UPDATE image_jobs (COMPLETED)

*Note: Render Video utilizes a slightly different flow where credits are reserved synchronously in the API, and committed directly via DB RPCs in the Worker.*

## 3. Frontend Audit
- **App Router Usage**: VERIFIED. Modern Next.js 15+ compatible architecture.
- **Data Fetching**: VERIFIED. Promise.all optimization effectively implemented in Dashboard.
- **State/Recovery**: VERIFIED. Client intelligently recovers polling states across refreshes using sessionStorage.

## 4. Backend Audit
- **Server Actions & API**: VERIFIED. Actions correctly rely on secure auth token verification.
- **Provider Abstraction**: VERIFIED. AdapterRegistry cleanly abstracts specific provider logic away from orchestration.
- **Finding**: Some Next.js 15+ breaking changes regarding async params in Route Handlers are present but were partially remediated.

## 5. Database & RLS Audit
- **Schema**: VERIFIED. image_jobs, wallet_transactions, and storage_files are structurally sound.
- **RLS**: OBSERVED ISSUES.
  - storage_files uses Service-Role only access securely.
  - CRITICAL: image_jobs UPDATE policy lacks a WITH CHECK clause and column restrictions.

## 6. Billing Audit
- **Idempotency**: VERIFIED. Database-level constraints inside reserve_credits prevent duplicate transactions on the same reference_id.

## 7. Storage / Cloudflare R2 Audit
- **Integration**: VERIFIED. MediaService efficiently streams buffers and computes SHA-256 hashes.
- **Finding**: No cleanup mechanism implemented for partial failure scenarios.

## 8. Worker Audit
- **Render Worker**: Uses a stateful Registration + Heartbeat mechanism.
- **Image Worker**: Uses a stateless Claim + Lease mechanism.
- **Finding**: Image Worker is missing update-time lease validation.

---

## Findings

### AUDIT-001: Worker Concurrency Race (Zombie Worker Overwrite)
- Category: Worker Concurrency
- Severity: CRITICAL (P0)
- Location: src/worker/image-worker.ts & supabase/migrations/20260727091100_add_image_jobs.sql
- Evidence: image-worker.ts updates job status without verifying worker_id or lease_until.
- Impact: If Worker A pauses/stalls past its lease, Worker B claims the job. When A resumes, it overwrites states leading to duplicate R2 uploads and race conditions.
- Recommended Action: Modify UPDATE statements to include eq('worker_id', WORKER_ID).

### AUDIT-002: Hardcoded Secrets in Debug Scripts
- Category: Security / Secrets
- Severity: CRITICAL (P0)
- Location: scripts/debug/*.js and scripts/debug/verify_fk.mjs
- Evidence: Files contain plain-text SUPABASE_SERVICE_ROLE_KEY.
- Impact: Complete compromise of the database if leaked.
- Recommended Action: Delete hardcoded keys and replace with process.env. Rotate keys.

### AUDIT-003: RLS Privilege Escalation on Image Jobs
- Category: Security / Authorization
- Severity: CRITICAL (P0)
- Location: supabase/migrations/20260727091100_add_image_jobs.sql
- Evidence: UPDATE policy lacks a WITH CHECK clause.
- Impact: A malicious user can alter num_images while a job is pending, tricking the Worker into false charges, or transfer job ownership (user_id spoofing).
- Recommended Action: Restrict UPDATE policy to specific safe columns.

### AUDIT-004: Orphan R2 Objects on Partial Failure
- Category: Storage / Data Consistency
- Severity: RISK (P1)
- Location: src/worker/image-worker.ts
- Evidence: R2 loop uploads sequentially. Error aborts billing but leaves previously uploaded files in R2.
- Impact: Orphan objects consume storage cost.
- Recommended Action: Implement a cleanup catch block or periodic GC.

### AUDIT-005: Architectural Inconsistency in Billing
- Category: Architecture / Coupling
- Severity: NEEDS HARDENING (P2)
- Location: api/render/route.ts vs api/images/route.ts
- Evidence: Video Render synchronously reserves credits on API POST. AI Image asynchronously reserves within the Worker.
- Impact: Users can spam PENDING jobs with 0 credits, blooming the DB with doomed jobs.
- Recommended Action: Unify both to reserve credits synchronously in the API.

### AUDIT-006: API Data Oversharing
- Category: Security / Data Exposure
- Severity: NEEDS HARDENING (P2)
- Location: src/app/api/images/[id]/route.ts
- Evidence: Returns SELECT * for image_jobs.
- Impact: Exposes provider_request and provider_response (internal routing/metadata) to the client.
- Recommended Action: Explicitly select only necessary fields.

### AUDIT-007: Missing Worker Polling Index
- Category: Performance
- Severity: NEEDS HARDENING (P2)
- Location: image_jobs schema
- Evidence: claim_next_image_job queries without composite index on status and lease_until.
- Impact: Sequential table scans (N+1 CPU burn).
- Recommended Action: Create a composite index on (status, lease_until, created_at).

### AUDIT-008: Missing Worker Scripts
- Category: Developer Experience
- Severity: MINOR (P3)
- Location: package.json
- Evidence: Missing worker:image script.
- Impact: Manual CLI execution needed.
- Recommended Action: Add script entry.

## Priority Matrix
| Priority | Finding ID | Description | Component |
| :--- | :--- | :--- | :--- |
| P0 | AUDIT-001 | Worker Concurrency Race | Image Worker |
| P0 | AUDIT-002 | Hardcoded Service Keys | Debug Scripts |
| P0 | AUDIT-003 | RLS Privilege Escalation | Database RLS |
| P1 | AUDIT-004 | R2 Orphan Objects | Image Worker / Storage |
| P2 | AUDIT-005 | Inconsistent Billing Architecture | API / Workers |
| P2 | AUDIT-006 | API Data Oversharing | Image API |
| P2 | AUDIT-007 | Missing Worker Polling Index | Database |
| P3 | AUDIT-008 | Missing Worker Scripts | package.json |

