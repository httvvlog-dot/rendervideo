# Architecture Audit Remediation P0 (Phase 4.5A)

## 1. Findings Addressed
- **AUDIT-001**: Worker Concurrency Race (Zombie Worker Overwrite)
- **AUDIT-002**: Hardcoded Service Role Keys in Source
- **AUDIT-003**: Image Job RLS Privilege Escalation

## 2. Root Cause Analysis
- **AUDIT-001**: image-worker.ts lacked ownership validation at intermediate and final DB update stages. If a worker stalled past its lease and another worker claimed the job, the zombie worker could wake up and overwrite the active worker's state without raising an error.
- **AUDIT-002**: Previous developers hardcoded SUPABASE_SERVICE_ROLE_KEY directly in utility scripts inside scripts/debug/ for testing purposes, permanently checking them into version control.
- **AUDIT-003**: The RLS policy for image_jobs allowed uthenticated users to UPDATE their own rows but lacked a WITH CHECK clause or column-level permissions. This allowed client-side mutation of billing-sensitive fields like 
um_images or user_id.

## 3. Changes Implemented
- **Worker Fencing**: Modified image-worker.ts so that every image_jobs update explicitly requires .eq('worker_id', WORKER_ID). If an update yields 0 rows, the worker throws a ZOMBIE_WORKER_FENCING exception, terminating its processing loop for that job safely.
- **Billing Engine Resilience**: Modified BillingEngine.executeAndCharge to detect ZOMBIE_WORKER_FENCING exceptions and abort cleanly *without* rolling back the billing transaction, preserving the credits committed by the active non-zombie worker.
- **Secrets Purged**: Replaced all instances of the hardcoded JWT token in 12 files inside scripts/debug/ with process.env.SUPABASE_SERVICE_ROLE_KEY.
- **RLS Restricted**: Created migration 20260927000004_fix_image_jobs_rls.sql to permanently DROP POLICY for UPDATEs on image_jobs. Client applications can only INSERT and SELECT.
- **Server Action Elevation**: Updated src/app/(user)/projects/[id]/image-actions.ts to use createAdminClient() instead of createClient() when internally updating job state, allowing it to bypass the dropped RLS policy correctly.

## 4. Security Model
- **Secrets Management**: No plaintext credentials remain in the codebase.
- **Warning**: The SUPABASE_SERVICE_ROLE_KEY exists in Git history and must be **ROTATED IMMEDIATELY** in the Supabase Dashboard.

## 5. Worker Fencing Model
- **Stage 1 (Provider Start)**: Intermediate state save (provider_result) is fenced with worker_id. If A stalls during fetch and B reclaims, A's intermediate save fails and A aborts.
- **Stage 2 (R2 Upload)**: A pre-upload fence verification (select('id').eq('worker_id')) was added. If B reclaimed during A's generation, A is prevented from making expensive Cloudflare R2 uploads.
- **Stage 3 (Finalization)**: The final .update({ status: 'COMPLETED' }) is fenced. If B finished it, A just logs a warning and exits cleanly without rolling back billing.

## 6. RLS Model
- image_jobs is now an Append-Only table from the perspective of the client browser. All state mutations (processing, completion, errors) are securely driven by backend infrastructure (Workers or Server Actions).

## 7. Secret Handling
- Validated via Get-ChildItem -Recurse | Select-String. 0 instances found in source tree. Must execute a key rotation manually.

## 8. Tests
- **Worker A/B Race Test**: A claims, stalls. B claims. A attempts .update() -> receives 0 rows -> throws ZOMBIE_WORKER_FENCING -> exits without rollback. PASS.
- **Billing Race Test**: ZOMBIE error bypasses rollback, allowing B's legitimate commit to stand. PASS.
- **RLS Test**: Malicious client running supabase.from('image_jobs').update({ num_images: 100 }) now fails natively via Postgres Row Level Security. PASS.
- **Secret Scan**: PASS.

## 9. Regression Results
- 
pm run build completed successfully, ensuring TypeScript safety (image-actions.ts and image-worker.ts) was preserved.

## 10. Remaining Risks
- R2 Orphan Objects (AUDIT-004) and Architectural Inconsistencies (AUDIT-005) remain as they were explicitly deferred.

## FINAL GATE STATUS
- **AUDIT-001**: PASS
- **AUDIT-002**: PASS (Pending manual Key Rotation)
- **AUDIT-003**: PASS
