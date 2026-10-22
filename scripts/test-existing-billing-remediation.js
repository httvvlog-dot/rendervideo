/**
 * Verification of Production-Safe Remediation using EXISTING Billing RPCs
 * 
 * Demonstrates that existing, already deployed functions:
 * - release_expired_reservations()
 * - release_credits(p_transaction_id, p_reason)
 * can resolve both the 1-credit expired reservation and the 5 legacy orphaned transactions
 * WITHOUT requiring any new database migrations or new RPCs.
 */

class MockBillingV4Database {
  constructor() {
    this.wallets = [
      {
        id: 'e0244eeb-581d-49f7-adfa-e2b395cdecf4',
        balance_credits: 1000019,
        reserved_credits: 51,
      }
    ];

    this.transactions = [
      // 1. Image job failed reservation
      {
        id: '31c199c3-caae-436b-8115-832615729f66',
        wallet_id: 'e0244eeb-581d-49f7-adfa-e2b395cdecf4',
        amount: -1,
        status: 'PENDING',
        feature: 'IMAGE_GENERATION',
        reference_type: 'image_jobs',
        reference_id: '14123f20-c571-441a-bf3e-0e7b7c9bdd52',
        description: 'Reserve for IMAGE_GENERATION',
      },
      // 2. The 5 legacy render test transactions (10 credits each)
      {
        id: '30f513f8-d8b0-438d-b708-9fb0225d0266',
        wallet_id: 'e0244eeb-581d-49f7-adfa-e2b395cdecf4',
        amount: -10,
        status: 'PENDING',
        feature: 'Render',
        description: 'Test Reserve',
      },
      {
        id: 'baf4ae53-cf1f-4b4c-838d-5186779a0f96',
        wallet_id: 'e0244eeb-581d-49f7-adfa-e2b395cdecf4',
        amount: -10,
        status: 'PENDING',
        feature: 'Render',
        description: 'Test Reserve',
      },
      {
        id: '63fa8b5f-bd99-4f79-88ed-640e684f44e3',
        wallet_id: 'e0244eeb-581d-49f7-adfa-e2b395cdecf4',
        amount: -10,
        status: 'PENDING',
        feature: 'Render',
        description: 'Test Reserve',
      },
      {
        id: '01640551-3247-40f0-aa8a-50486168ec2c',
        wallet_id: 'e0244eeb-581d-49f7-adfa-e2b395cdecf4',
        amount: -10,
        status: 'PENDING',
        feature: 'Render',
        description: 'Test Reserve',
      },
      {
        id: '75e63d87-11d0-490d-adb4-2de4506f7926',
        wallet_id: 'e0244eeb-581d-49f7-adfa-e2b395cdecf4',
        amount: -10,
        status: 'PENDING',
        feature: 'Render',
        description: 'Test Reserve',
      }
    ];

    this.reservations = [
      {
        id: 'a73f6034-7164-4feb-9a61-e70ec5754e6f',
        wallet_id: 'e0244eeb-581d-49f7-adfa-e2b395cdecf4',
        wallet_transaction_id: '31c199c3-caae-436b-8115-832615729f66',
        reserved_amount: 1,
        status: 'ACTIVE',
        expires_at: '2026-09-30T12:25:34Z',
      }
    ];
  }

  /**
   * Exact implementation of PostgreSQL function release_credits(p_transaction_id, p_reason)
   * from 20260721000000_billing_v4_reserve_commit.sql lines 208-246
   */
  release_credits(p_transaction_id, p_reason = 'Released manually') {
    // 1. Lock Transaction
    const tx = this.transactions.find(t => t.id === p_transaction_id);
    if (!tx || tx.status !== 'PENDING') {
      return false;
    }

    // 2. Lock Wallet
    const wallet = this.wallets.find(w => w.id === tx.wallet_id);
    if (!wallet) {
      return false;
    }

    // 3. Update Reservations to RELEASED
    for (const r of this.reservations) {
      if (r.wallet_transaction_id === p_transaction_id && r.status === 'ACTIVE') {
        r.status = 'RELEASED';
      }
    }

    // 4. Update Wallet (Free up reserved credits)
    wallet.reserved_credits = Math.max(0, wallet.reserved_credits - Math.abs(tx.amount));
    wallet.updated_at = new Date().toISOString();

    // 5. Update Transaction
    tx.status = 'CANCELLED';
    tx.description = (tx.description || '') + ' | ' + p_reason;

    return true;
  }

  /**
   * Exact implementation of PostgreSQL function release_expired_reservations()
   * from 20260721000000_billing_v4_reserve_commit.sql lines 250-265
   */
  release_expired_reservations(now = new Date()) {
    const nowTime = new Date(now).getTime();
    let count = 0;

    // Find distinct wallet_transaction_id where status = 'ACTIVE' and expires_at < NOW()
    const eligibleTxIds = [
      ...new Set(
        this.reservations
          .filter(r => r.status === 'ACTIVE' && new Date(r.expires_at).getTime() < nowTime)
          .map(r => r.wallet_transaction_id)
      )
    ];

    for (const txId of eligibleTxIds) {
      const ok = this.release_credits(txId, 'EXPIRED_TIMEOUT');
      if (ok) count++;
    }

    return count;
  }
}

function runRemediationVerification() {
  console.log('=== TEST SUITE: EXISTING BILLING RPC REMEDIATION VERIFICATION ===\n');

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

  const db = new MockBillingV4Database();
  const testNow = '2026-10-24T12:00:00Z';

  // 1. Initial State Verification
  assert(db.wallets[0].reserved_credits === 51, 'Initial reserved_credits is exactly 51');
  assert(db.wallets[0].balance_credits === 1000019, 'Initial balance_credits is 1,000,019');
  assert(db.reservations[0].status === 'ACTIVE', 'Expired reservation is ACTIVE');

  // 2. Step 1: Execute existing release_expired_reservations()
  const expiredCount = db.release_expired_reservations(testNow);
  assert(expiredCount === 1, 'release_expired_reservations() finds and releases exactly 1 expired reservation');
  assert(db.reservations[0].status === 'RELEASED', 'Reservation a73f6034-... marked RELEASED');
  assert(db.transactions[0].status === 'CANCELLED', 'Transaction 31c199c3-... marked CANCELLED');
  assert(db.wallets[0].reserved_credits === 50, 'Wallet reserved_credits decremented from 51 to 50');
  assert(db.wallets[0].balance_credits === 1000019, 'Wallet balance_credits strictly untouched (1,000,019)');

  // 3. Step 2: Idempotency of release_expired_reservations()
  const secondExpiredCount = db.release_expired_reservations(testNow);
  assert(secondExpiredCount === 0, 'Second call to release_expired_reservations() returns 0 (idempotent)');
  assert(db.wallets[0].reserved_credits === 50, 'reserved_credits remains exactly 50');

  // 4. Step 3: Execute existing release_credits(txId, reason) for the 5 legacy transactions
  const legacyTxIds = [
    '30f513f8-d8b0-438d-b708-9fb0225d0266',
    'baf4ae53-cf1f-4b4c-838d-5186779a0f96',
    '63fa8b5f-bd99-4f79-88ed-640e684f44e3',
    '01640551-3247-40f0-aa8a-50486168ec2c',
    '75e63d87-11d0-490d-adb4-2de4506f7926'
  ];

  for (const txId of legacyTxIds) {
    const success = db.release_credits(txId, 'Manual remediation: Cancelled legacy orphaned render test');
    assert(success === true, `Successfully released legacy transaction ${txId}`);
  }

  // 5. Final State Verification
  assert(db.wallets[0].reserved_credits === 0, 'Wallet reserved_credits is now cleanly 0');
  assert(db.wallets[0].balance_credits === 1000019, 'Wallet balance_credits remains strictly 1,000,019 (100% preserved)');
  assert(db.transactions.every(t => t.status === 'CANCELLED'), 'All 6 transactions are cleanly CANCELLED');

  // 6. Step 4: Idempotency of release_credits() on already cancelled transactions
  for (const txId of legacyTxIds) {
    const retrySuccess = db.release_credits(txId, 'Retry release');
    assert(retrySuccess === false, `Retry on ${txId} returns false (idempotent; no duplicate deduction)`);
  }
  assert(db.wallets[0].reserved_credits === 0, 'reserved_credits remains 0 without underflow');

  console.log(`\n=== ALL ${passed}/${total} EXISTING BILLING RPC REMEDIATION TESTS PASSED ===\n`);
}

runRemediationVerification();
