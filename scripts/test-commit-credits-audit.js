// scripts/test-commit-credits-audit.js
// Automated verification of hardened commit_credits logic

const assert = require('assert');

class MockDatabase {
  constructor() {
    this.wallets = new Map();
    this.buckets = new Map();
    this.transactions = new Map();
    this.reservations = new Map();
  }

  setupState({ walletId, userId, balance, reserved, buckets }) {
    this.wallets.set(walletId, {
      id: walletId,
      user_id: userId,
      balance_credits: balance,
      reserved_credits: reserved,
      lifetime_used: 0,
      total_consumed_credits: 0,
      updated_at: new Date()
    });

    for (const b of buckets) {
      this.buckets.set(b.id, {
        id: b.id,
        wallet_id: walletId,
        bucket_type: b.type || 'PURCHASED',
        balance: b.balance,
        expires_at: b.expires_at || null,
        created_at: new Date()
      });
    }
  }

  addPendingReservation({ txId, walletId, userId, amount, allocations }) {
    this.transactions.set(txId, {
      id: txId,
      wallet_id: walletId,
      user_id: userId,
      transaction_type: 'VIDEO_RENDER',
      amount: -amount,
      balance_before: this.wallets.get(walletId).balance_credits,
      balance_after: this.wallets.get(walletId).balance_credits,
      status: 'PENDING',
      provider: 'render_worker',
      feature: 'Render'
    });

    for (const alloc of allocations) {
      this.reservations.set(alloc.id, {
        id: alloc.id,
        wallet_id: walletId,
        wallet_transaction_id: txId,
        bucket_id: alloc.bucketId,
        reserved_amount: alloc.amount,
        status: 'ACTIVE',
        expires_at: new Date(Date.now() + 15 * 60 * 1000)
      });
    }
  }

  snapshot() {
    return JSON.stringify({
      wallets: Array.from(this.wallets.entries()),
      buckets: Array.from(this.buckets.entries()),
      transactions: Array.from(this.transactions.entries()),
      reservations: Array.from(this.reservations.entries())
    });
  }

  restore(snap) {
    const data = JSON.parse(snap);
    this.wallets = new Map(data.wallets);
    this.buckets = new Map(data.buckets);
    this.transactions = new Map(data.transactions);
    this.reservations = new Map(data.reservations);
  }

  // Hardened commit_credits simulation
  commitCredits(txId) {
    const snap = this.snapshot();

    try {
      // 1. Read wallet_id without lock
      const txInitial = this.transactions.get(txId);
      if (!txInitial) {
        return false;
      }
      const walletId = txInitial.wallet_id;

      // 2. Lock Wallet first (Root Mutex)
      const wallet = this.wallets.get(walletId);
      if (!wallet) {
        return false;
      }

      // 3. Lock Transaction under wallet lock
      const tx = this.transactions.get(txId);
      if (!tx || tx.wallet_id !== walletId || tx.status !== 'PENDING') {
        return false;
      }

      const txAmount = Math.abs(tx.amount);

      // 4. Verify Active Reservations sum matches tx amount
      const activeRes = Array.from(this.reservations.values())
        .filter(r => r.wallet_transaction_id === txId && r.status === 'ACTIVE');
      
      const totalReservedAmount = activeRes.reduce((acc, r) => acc + r.reserved_amount, 0);
      if (totalReservedAmount !== txAmount) {
        throw new Error(`CRITICAL: Reservation discrepancy. Transaction amount ${txAmount} does not match active reservations sum ${totalReservedAmount}`);
      }

      // 5. Strict reserved_credits underflow check (NO GREATEST(0) masking)
      if (wallet.reserved_credits < txAmount) {
        throw new Error(`CRITICAL: Wallet reserved_credits underflow. Current ${wallet.reserved_credits} < ${txAmount}`);
      }

      // 6. Deduct from Buckets with balance assertion
      for (const res of activeRes) {
        const bucket = this.buckets.get(res.bucket_id);
        if (!bucket) {
          throw new Error(`CRITICAL: Bucket ${res.bucket_id} not found`);
        }
        if (bucket.balance < res.reserved_amount) {
          throw new Error(`CRITICAL: Bucket ${res.bucket_id} has insufficient balance ${bucket.balance} for reservation ${res.reserved_amount}`);
        }

        bucket.balance -= res.reserved_amount;
        res.status = 'COMMITTED';
      }

      // 7. Calculate new total balance from unexpired buckets
      const totalBalance = Array.from(this.buckets.values())
        .filter(b => b.wallet_id === walletId && (!b.expires_at || new Date(b.expires_at) > new Date()))
        .reduce((acc, b) => acc + b.balance, 0);

      // 8. Update Wallet without masking
      wallet.balance_credits = totalBalance;
      wallet.reserved_credits -= txAmount;
      wallet.lifetime_used += txAmount;
      wallet.total_consumed_credits += txAmount;
      wallet.updated_at = new Date();

      // 9. Update Transaction
      tx.status = 'COMPLETED';
      tx.balance_after = totalBalance;

      return true;
    } catch (err) {
      // Atomic rollback to snapshot
      this.restore(snap);
      throw err;
    }
  }
}

function runTests() {
  console.log("=== TEST SUITE: AUDIT & HARDEN commit_credits ===");

  const db = new MockDatabase();
  const WALLET_ID = 'w-100';
  const USER_ID = 'u-100';
  const TX_ID = 'tx-100';
  const BUCKET_1 = 'b-1';
  const BUCKET_2 = 'b-2';

  // 1. Success commit scenario
  db.setupState({
    walletId: WALLET_ID,
    userId: USER_ID,
    balance: 100,
    reserved: 30,
    buckets: [
      { id: BUCKET_1, balance: 20 },
      { id: BUCKET_2, balance: 80 }
    ]
  });
  db.addPendingReservation({
    txId: TX_ID,
    walletId: WALLET_ID,
    userId: USER_ID,
    amount: 30,
    allocations: [
      { id: 'r-1', bucketId: BUCKET_1, amount: 20 },
      { id: 'r-2', bucketId: BUCKET_2, amount: 10 }
    ]
  });

  const res1 = db.commitCredits(TX_ID);
  assert.strictEqual(res1, true, "Commit should succeed");
  assert.strictEqual(db.wallets.get(WALLET_ID).balance_credits, 70, "Wallet balance 100 - 30 = 70");
  assert.strictEqual(db.wallets.get(WALLET_ID).reserved_credits, 0, "Wallet reserved freed to 0");
  assert.strictEqual(db.wallets.get(WALLET_ID).lifetime_used, 30, "Lifetime used incremented by 30");
  assert.strictEqual(db.wallets.get(WALLET_ID).total_consumed_credits, 30, "Total consumed incremented by 30");
  assert.strictEqual(db.buckets.get(BUCKET_1).balance, 0, "Bucket 1 balance deducted to 0");
  assert.strictEqual(db.buckets.get(BUCKET_2).balance, 70, "Bucket 2 balance deducted to 70");
  assert.strictEqual(db.transactions.get(TX_ID).status, 'COMPLETED', "Tx status COMPLETED");
  assert.strictEqual(db.reservations.get('r-1').status, 'COMMITTED', "Res 1 status COMMITTED");
  assert.strictEqual(db.reservations.get('r-2').status, 'COMMITTED', "Res 2 status COMMITTED");
  console.log("[PASS] Clean commit successfully deducts buckets, frees reserved, and updates stats");

  // 2. Repeat commit (idempotent exit)
  const resRepeat = db.commitCredits(TX_ID);
  assert.strictEqual(resRepeat, false, "Repeat commit on non-PENDING must return false");
  assert.strictEqual(db.wallets.get(WALLET_ID).balance_credits, 70, "Balance not deducted twice");
  assert.strictEqual(db.wallets.get(WALLET_ID).reserved_credits, 0, "Reserved not decremented twice");
  console.log("[PASS] Repeat commit returns false and performs zero mutations");

  // 3. Rollback scenario: Insufficient bucket balance
  const TX_FAIL_1 = 'tx-fail-1';
  db.setupState({
    walletId: WALLET_ID,
    userId: USER_ID,
    balance: 70,
    reserved: 25,
    buckets: [
      { id: BUCKET_1, balance: 5 }, // Only 5 available!
      { id: BUCKET_2, balance: 65 }
    ]
  });
  // Allocation demands 10 from BUCKET_1, but it only has 5!
  db.addPendingReservation({
    txId: TX_FAIL_1,
    walletId: WALLET_ID,
    userId: USER_ID,
    amount: 25,
    allocations: [
      { id: 'r-fail-1', bucketId: BUCKET_1, amount: 10 },
      { id: 'r-fail-2', bucketId: BUCKET_2, amount: 15 }
    ]
  });

  let threwBucketError = false;
  try {
    db.commitCredits(TX_FAIL_1);
  } catch (err) {
    threwBucketError = true;
    assert.match(err.message, /insufficient balance/i);
  }
  assert.strictEqual(threwBucketError, true, "Must throw bucket balance error");
  assert.strictEqual(db.wallets.get(WALLET_ID).balance_credits, 70, "Wallet balance rolled back (70)");
  assert.strictEqual(db.wallets.get(WALLET_ID).reserved_credits, 25, "reserved_credits rolled back (25)");
  assert.strictEqual(db.buckets.get(BUCKET_1).balance, 5, "Bucket 1 balance untouched (5)");
  assert.strictEqual(db.buckets.get(BUCKET_2).balance, 65, "Bucket 2 balance untouched (65)");
  assert.strictEqual(db.transactions.get(TX_FAIL_1).status, 'PENDING', "Tx remains PENDING");
  assert.strictEqual(db.reservations.get('r-fail-1').status, 'ACTIVE', "Res 1 remains ACTIVE");
  assert.strictEqual(db.reservations.get('r-fail-2').status, 'ACTIVE', "Res 2 remains ACTIVE");
  console.log("[PASS] Insufficient bucket balance aborts atomically and preserves PENDING/ACTIVE state");

  // 4. Rollback scenario: Reservation sum mismatch
  const TX_FAIL_2 = 'tx-fail-2';
  db.setupState({
    walletId: WALLET_ID,
    userId: USER_ID,
    balance: 70,
    reserved: 20,
    buckets: [{ id: BUCKET_1, balance: 70 }]
  });
  // Tx amount is 20, but reservations sum to 15!
  db.addPendingReservation({
    txId: TX_FAIL_2,
    walletId: WALLET_ID,
    userId: USER_ID,
    amount: 20,
    allocations: [{ id: 'r-fail-3', bucketId: BUCKET_1, amount: 15 }]
  });

  let threwMismatchError = false;
  try {
    db.commitCredits(TX_FAIL_2);
  } catch (err) {
    threwMismatchError = true;
    assert.match(err.message, /Reservation discrepancy/i);
  }
  assert.strictEqual(threwMismatchError, true, "Must throw reservation mismatch error");
  assert.strictEqual(db.wallets.get(WALLET_ID).balance_credits, 70, "Balance untouched");
  assert.strictEqual(db.wallets.get(WALLET_ID).reserved_credits, 20, "Reserved untouched");
  assert.strictEqual(db.transactions.get(TX_FAIL_2).status, 'PENDING', "Tx remains PENDING");
  assert.strictEqual(db.reservations.get('r-fail-3').status, 'ACTIVE', "Res remains ACTIVE");
  console.log("[PASS] Reservation discrepancy aborts atomically and preserves PENDING/ACTIVE state");

  // 5. Rollback scenario: Wallet reserved_credits underflow (no GREATEST(0) hiding)
  const TX_FAIL_3 = 'tx-fail-3';
  db.setupState({
    walletId: WALLET_ID,
    userId: USER_ID,
    balance: 50,
    reserved: 5, // Only 5 reserved in wallet, but tx demands 20!
    buckets: [{ id: BUCKET_1, balance: 50 }]
  });
  db.addPendingReservation({
    txId: TX_FAIL_3,
    walletId: WALLET_ID,
    userId: USER_ID,
    amount: 20,
    allocations: [{ id: 'r-fail-4', bucketId: BUCKET_1, amount: 20 }]
  });

  let threwUnderflowError = false;
  try {
    db.commitCredits(TX_FAIL_3);
  } catch (err) {
    threwUnderflowError = true;
    assert.match(err.message, /underflow/i);
  }
  assert.strictEqual(threwUnderflowError, true, "Must throw underflow error without masking");
  assert.strictEqual(db.wallets.get(WALLET_ID).reserved_credits, 5, "reserved_credits preserved without underflow");
  assert.strictEqual(db.transactions.get(TX_FAIL_3).status, 'PENDING', "Tx remains PENDING");
  console.log("[PASS] Wallet underflow throws exception and rejects GREATEST(0) masking");

  // 6. Non-existent transaction
  const resNonExistent = db.commitCredits('non-existent-uuid');
  assert.strictEqual(resNonExistent, false, "Non-existent tx returns false");
  console.log("[PASS] Non-existent transaction returns false gracefully");

  console.log("\n=== ALL 6/6 commit_credits AUDIT TESTS PASSED ===");
}

runTests();
