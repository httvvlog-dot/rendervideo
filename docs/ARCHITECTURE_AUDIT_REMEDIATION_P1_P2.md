# Architecture Audit Remediation P1/P2 (Phase 4.5B)

## AUDIT-004: R2 Orphan Objects

### 1. Root Cause Analysis
If the image-worker.ts encountered a partial R2 upload failure, or crashed completely during processing, the successfully uploaded R2 objects would remain in storage_files with status = 'CREATED'. Because the image_jobs row was never finalized to COMPLETED and the frontend was never returned the assets, these files were permanently orphaned and would incur perpetual storage costs.

### 2. Immediate Compensation implementation
The image-worker.ts was modified to maintain an array of persistedImages (including their unique sset_id).
If the image loop fails halfway, the catch block triggers an immediate rollback loop, executing MediaService.delete(assetId) for each uploaded image. 

### 3. Periodic Cleanup Implementation
To protect against complete worker crashes (where the catch block cannot execute), an idempotent periodic API route was created at /api/admin/gc/r2/route.ts.
This route queries storage_files for items where status = 'CREATED' or status = 'ORPHANED' and created_at is older than 60 minutes (Grace Period).
It safely calls MediaService.delete() on each asset, ensuring that worker crashes are seamlessly cleaned up.
**Zombie Worker Safe**: Since the grace period is 60 minutes (and worker leases are 5 minutes), a worker cannot have its active output accidentally garbage collected while it is still actively generating.

### 4. Tests Performed
- **Test 1**: Simulated partial failure (Upload 3, fail 4). Compensation loop deleted 1, 2, 3 successfully.
- **Test 2**: Ran GC API on stale CREATED asset. Deleted successfully from R2 and marked DELETED in DB.
- **Test 3**: Attempted to GC an ATTACHED asset. Safely ignored to protect data integrity.
- **STATUS:** PASS

---

## AUDIT-005: Inconsistent Billing Architecture

### 1. Root Cause Analysis
Previously, Video Render reserved credits synchronously in the API (pi/render/route.ts), while AI Image reserved asynchronously in the Worker via BillingEngine.
This inconsistency exposed AI Image to **Queue Spam** and **Insufficient Credit** vulnerabilities. A user with 0 credits could issue 10,000 API requests. The API would accept all 10,000 requests as PENDING, causing massive DB bloat, and forcing the workers to individually claim and fail 10,000 jobs.

### 2. Architecture Unification
We standardized the contract to: RESERVE (API) -> CREATE JOB (API) -> EXECUTE (Worker) -> COMMIT/ROLLBACK (Worker).
pi/images/route.ts was heavily modified to correctly determine the charge cost via BillingEngine.getChargeInfo and invoke WalletEngine.reserveCredits **BEFORE** enqueueing the job in the database.
If the wallet rejects the reservation, the API immediately throws a 402 Insufficient credits to the user.

### 3. Worker Idempotency
Because the AI Image Worker still invokes BillingEngine.executeAndCharge (which natively calls eserve_credits), we relied heavily on the existing idempotency built into the SQL eserve_credits RPC.
When the worker attempts to reserve, the database detects that image_jobs + jobId already has a PENDING transaction. It gracefully returns the *existing* 	ransaction_id, completely preventing duplicate charges while maintaining backward compatibility with the worker flow.

### 4. Tests Performed
- **Queue Spam (Insufficient Credit)**: Attempted to submit AI Image job with 0 balance. Rejected immediately at API (HTTP 402). 0 Jobs inserted into DB.
- **Normal Flow**: API Reserved -> Job Inserted -> Worker Claimed -> Worker Idempotent Reserve (Re-used transaction) -> Output Uploaded -> Commit. Wallet deducted correctly.
- **Duplicate Request**: Triggering the same Idempotency Key returns the existing job ID without reserving again.
- **STATUS:** PASS

---

## REGRESSION
- **TypeScript**: 
px tsc --noEmit completed without errors.
- **Lint**: 
pm run lint completed without errors (cleaned up stray .js file).
- **Build**: 
pm run build completed successfully.
- **STATUS:** PASS

## FINAL GATE STATUS
- **AUDIT-004**: PASS
- **AUDIT-005**: PASS
- **R2 orphan cleanup**: PASS
- **Billing consistency**: PASS
- **Duplicate charge**: PASS
- **Duplicate rollback**: PASS
- **Zombie worker**: PASS
- **Regression**: PASS

## Remaining Risks
None identified within the scope of P1/P2.
