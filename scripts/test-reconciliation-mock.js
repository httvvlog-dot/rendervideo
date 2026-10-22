/**
 * Mock Unit Test for Wallet Reservation Reconciliation (Task 3)
 * 
 * Verifies that the proposed reconciliation algorithm:
 * 1. Only releases expired active reservations with failed/stale jobs.
 * 2. Resolves legacy orphaned pending transactions where referenced jobs do not exist.
 * 3. Never touches valid active, committed, or already released reservations.
 * 4. Is strictly idempotent.
 * 5. Guarantees wallet reserved_credits never drops below 0.
 */

class MockDB {
  constructor(initialData) {
    this.wallets = JSON.parse(JSON.stringify(initialData.wallets || []));
    this.transactions = JSON.parse(JSON.stringify(initialData.transactions || []));
    this.reservations = JSON.parse(JSON.stringify(initialData.reservations || []));
    this.jobs = JSON.parse(JSON.stringify(initialData.jobs || []));
    this.auditLogs = [];
  }

  getWallet(id) {
    return this.wallets.find(w => w.id === id);
  }

  getTransaction(id) {
    return this.transactions.find(t => t.id === id);
  }

  getReservation(id) {
    return this.reservations.find(r => r.id === id);
  }

  getJob(type, id) {
    return this.jobs.find(j => j.type === type && j.id === id);
  }
}

/**
 * Reconciliation Engine Implementation
 */
function reconcileWalletReservations(db, currentTime = new Date()) {
  const currentEpoch = new Date(currentTime).getTime();
  const candidates = [];
  let releasedCreditsCount = 0;

  // PHASE 1: Reconcile Expired Reservations in wallet_reservations
  for (const resv of db.reservations) {
    if (resv.status !== 'ACTIVE') continue;

    const expiresAtEpoch = new Date(resv.expires_at).getTime();
    const isExpired = expiresAtEpoch < currentEpoch;

    if (!isExpired) {
      // Valid active reservation: DO NOT TOUCH
      continue;
    }

    const tx = db.getTransaction(resv.wallet_transaction_id);
    if (!tx || tx.status !== 'PENDING') {
      candidates.push({
        type: 'EXPIRED_RESERVATION',
        reservationId: resv.id,
        transactionId: resv.wallet_transaction_id,
        walletId: resv.wallet_id,
        amount: resv.reserved_amount,
        reason: 'Reservation expired but transaction is not PENDING - requires manual review',
        eligibleForRelease: false,
      });
      continue;
    }

    // Check associated job status
    const job = db.getJob(tx.reference_type, tx.reference_id);
    const isJobFailedOrStale = !job || ['FAILED', 'CANCELLED'].includes(job.status);

    if (isJobFailedOrStale) {
      // Eligible for release
      resv.status = 'RELEASED';
      resv.released_at = new Date(currentEpoch).toISOString();

      tx.status = 'CANCELLED';
      tx.description = (tx.description || '') + ' | Auto-released: Expired reservation with terminated/failed job';

      const wallet = db.getWallet(resv.wallet_id);
      if (wallet) {
        wallet.reserved_credits = Math.max(0, wallet.reserved_credits - resv.reserved_amount);
      }

      releasedCreditsCount += resv.reserved_amount;
      candidates.push({
        type: 'EXPIRED_RESERVATION',
        reservationId: resv.id,
        transactionId: tx.id,
        walletId: resv.wallet_id,
        amount: resv.reserved_amount,
        reason: 'Expired reservation with failed/missing job released successfully',
        eligibleForRelease: true,
      });

      db.auditLogs.push({
        action: 'RELEASE_EXPIRED_RESERVATION',
        reservationId: resv.id,
        amount: resv.reserved_amount,
        walletId: resv.wallet_id,
      });
    }
  }

  // PHASE 2: Reconcile Legacy Orphaned Pending Transactions (No reservation row, job missing)
  for (const tx of db.transactions) {
    if (tx.status !== 'PENDING') continue;

    // Check if an active reservation already manages this tx
    const hasActiveResv = db.reservations.some(r => r.wallet_transaction_id === tx.id && r.status === 'ACTIVE');
    if (hasActiveResv) continue;

    // Check age of transaction (> 7 days)
    const txCreatedEpoch = new Date(tx.created_at).getTime();
    const isOlderThan7Days = (currentEpoch - txCreatedEpoch) > (7 * 24 * 3600 * 1000);

    const job = db.getJob(tx.reference_type, tx.reference_id);

    if (isOlderThan7Days && !job) {
      const releaseAmount = Math.abs(tx.amount);
      tx.status = 'CANCELLED';
      tx.description = (tx.description || '') + ' | Auto-reconciled: Legacy orphaned pending transaction with non-existent job';

      const wallet = db.getWallet(tx.wallet_id);
      if (wallet) {
        wallet.reserved_credits = Math.max(0, wallet.reserved_credits - releaseAmount);
      }

      releasedCreditsCount += releaseAmount;
      candidates.push({
        type: 'ORPHANED_PENDING_TX',
        transactionId: tx.id,
        walletId: tx.wallet_id,
        amount: releaseAmount,
        reason: 'Legacy orphaned transaction with non-existent job cancelled',
        eligibleForRelease: true,
      });

      db.auditLogs.push({
        action: 'CANCEL_ORPHANED_TX',
        transactionId: tx.id,
        amount: releaseAmount,
        walletId: tx.wallet_id,
      });
    }
  }

  return {
    candidates,
    releasedCreditsCount,
    auditLogs: db.auditLogs,
  };
}

function runTests() {
  console.log('=== TEST SUITE: WALLET RESERVATION RECONCILIATION MOCK ===\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // Setup mock database mirroring actual inspected production state
  const mockInitialData = {
    wallets: [
      {
        id: 'e0244eeb-581d-49f7-adfa-e2b395cdecf4',
        balance_credits: 1000019,
        reserved_credits: 51,
      },
      {
        id: '36d59da1-e163-4c18-9738-fbfc87b1d090',
        balance_credits: 0,
        reserved_credits: 0,
      }
    ],
    transactions: [
      // 1. The 1-credit image transaction linked to expired reservation
      {
        id: '31c199c3-caae-436b-8115-832615729f66',
        wallet_id: 'e0244eeb-581d-49f7-adfa-e2b395cdecf4',
        amount: -1,
        status: 'PENDING',
        reference_type: 'image_jobs',
        reference_id: '14123f20-c571-441a-bf3e-0e7b7c9bdd52',
        created_at: '2026-09-30T12:10:34Z',
      },
      // 2. The 5 legacy render transactions (10 credits each) from July 2026
      {
        id: 'tx-legacy-1',
        wallet_id: 'e0244eeb-581d-49f7-adfa-e2b395cdecf4',
        amount: -10,
        status: 'PENDING',
        reference_type: 'render_jobs',
        reference_id: 'job-legacy-1',
        created_at: '2026-07-23T13:21:58Z',
      },
      {
        id: 'tx-legacy-2',
        wallet_id: 'e0244eeb-581d-49f7-adfa-e2b395cdecf4',
        amount: -10,
        status: 'PENDING',
        reference_type: 'render_jobs',
        reference_id: 'job-legacy-2',
        created_at: '2026-07-23T13:21:07Z',
      },
      {
        id: 'tx-legacy-3',
        wallet_id: 'e0244eeb-581d-49f7-adfa-e2b395cdecf4',
        amount: -10,
        status: 'PENDING',
        reference_type: 'render_jobs',
        reference_id: 'job-legacy-3',
        created_at: '2026-07-23T13:15:05Z',
      },
      {
        id: 'tx-legacy-4',
        wallet_id: 'e0244eeb-581d-49f7-adfa-e2b395cdecf4',
        amount: -10,
        status: 'PENDING',
        reference_type: 'render_jobs',
        reference_id: 'job-legacy-4',
        created_at: '2026-07-23T13:13:46Z',
      },
      {
        id: 'tx-legacy-5',
        wallet_id: 'e0244eeb-581d-49f7-adfa-e2b395cdecf4',
        amount: -10,
        status: 'PENDING',
        reference_type: 'render_jobs',
        reference_id: 'job-legacy-5',
        created_at: '2026-07-23T13:12:58Z',
      },
      // 3. Control case: A currently active, non-expired transaction & reservation (5 credits)
      {
        id: 'tx-active-valid',
        wallet_id: 'e0244eeb-581d-49f7-adfa-e2b395cdecf4',
        amount: -5,
        status: 'PENDING',
        reference_type: 'render_jobs',
        reference_id: 'job-active-valid',
        created_at: '2026-10-24T08:00:00Z',
      },
      // 4. Control case: An already COMMITTED transaction
      {
        id: 'tx-committed',
        wallet_id: 'e0244eeb-581d-49f7-adfa-e2b395cdecf4',
        amount: -1,
        status: 'COMPLETED',
        reference_type: 'script_generation',
        reference_id: 'script-1',
        created_at: '2026-10-24T08:28:55Z',
      }
    ],
    reservations: [
      {
        id: 'a73f6034-7164-4feb-9a61-e70ec5754e6f',
        wallet_id: 'e0244eeb-581d-49f7-adfa-e2b395cdecf4',
        wallet_transaction_id: '31c199c3-caae-436b-8115-832615729f66',
        reserved_amount: 1,
        status: 'ACTIVE',
        expires_at: '2026-09-30T12:25:34Z',
      },
      {
        id: 'resv-active-valid',
        wallet_id: 'e0244eeb-581d-49f7-adfa-e2b395cdecf4',
        wallet_transaction_id: 'tx-active-valid',
        reserved_amount: 5,
        status: 'ACTIVE',
        expires_at: '2026-10-24T12:00:00Z', // Expires in the future
      },
      {
        id: 'resv-already-released',
        wallet_id: 'e0244eeb-581d-49f7-adfa-e2b395cdecf4',
        wallet_transaction_id: 'tx-committed',
        reserved_amount: 1,
        status: 'RELEASED',
        expires_at: '2026-09-30T10:00:00Z',
      }
    ],
    jobs: [
      {
        type: 'image_jobs',
        id: '14123f20-c571-441a-bf3e-0e7b7c9bdd52',
        status: 'FAILED',
      },
      {
        type: 'render_jobs',
        id: 'job-active-valid',
        status: 'PROCESSING',
      }
      // job-legacy-1 to 5 DO NOT EXIST
    ]
  };

  const db = new MockDB(mockInitialData);

  // Set current test time: 2026-10-24T09:00:00Z
  const testCurrentTime = '2026-10-24T09:00:00Z';

  // 1. Run Reconciliation Pass 1
  const result1 = reconcileWalletReservations(db, testCurrentTime);

  assert(result1.candidates.length === 6, 'Exactly 6 candidates identified (1 expired resv + 5 legacy orphaned txs)');
  assert(result1.releasedCreditsCount === 51, 'Total released credits is exactly 51');

  // Verify wallet state
  const targetWallet = db.getWallet('e0244eeb-581d-49f7-adfa-e2b395cdecf4');
  assert(targetWallet.reserved_credits === 0, 'Wallet reserved_credits decremented from 51 to 0');
  assert(targetWallet.balance_credits === 1000019, 'Wallet balance_credits remains strictly untouched (1000019)');

  // Verify control cases were preserved
  const validResv = db.getReservation('resv-active-valid');
  assert(validResv.status === 'ACTIVE', 'Active non-expired reservation preserved untouched as ACTIVE');

  const validTx = db.getTransaction('tx-active-valid');
  assert(validTx.status === 'PENDING', 'Active running transaction preserved as PENDING');

  const committedTx = db.getTransaction('tx-committed');
  assert(committedTx.status === 'COMPLETED', 'Committed transaction preserved as COMPLETED');

  // 2. Test Idempotency: Run Reconciliation Pass 2 immediately
  const result2 = reconcileWalletReservations(db, testCurrentTime);
  assert(result2.candidates.length === 0, 'Second pass finds 0 candidates (idempotent)');
  assert(result2.releasedCreditsCount === 0, 'Second pass releases 0 credits');
  assert(targetWallet.reserved_credits === 0, 'Wallet reserved_credits remains 0');

  console.log(`\n=== ALL ${passed}/${total} RECONCILIATION MOCK TESTS PASSED ===\n`);
}

runTests();
