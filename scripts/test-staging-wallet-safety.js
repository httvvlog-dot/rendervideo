// scripts/test-staging-wallet-safety.js
// Automated verification suite for Hatara Studio V2.1 Wallet Safety & Staging Concurrency Plan

const assert = require('assert');

/**
 * MOCK / SIMULATION TEST ENGINE
 * Demonstrates exact state machine transitions, assertions, and rollback mechanics.
 */
class StagingSimulationEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.wallets = new Map();
    this.buckets = new Map();
    this.transactions = new Map();
    this.reservations = new Map();
    this.costLogs = [];
  }

  setupWallet(walletId, userId, balance, reserved = 0) {
    this.wallets.set(walletId, {
      id: walletId,
      user_id: userId,
      balance_credits: balance,
      reserved_credits: reserved,
      lifetime_used: 0,
      total_consumed_credits: 0
    });
  }

  setupBucket(bucketId, walletId, balance, expiresAt = null) {
    this.buckets.set(bucketId, {
      id: bucketId,
      wallet_id: walletId,
      balance: balance,
      expires_at: expiresAt
    });
  }

  snapshot() {
    return JSON.stringify({
      wallets: Array.from(this.wallets.entries()),
      buckets: Array.from(this.buckets.entries()),
      transactions: Array.from(this.transactions.entries()),
      reservations: Array.from(this.reservations.entries()),
      costLogs: [...this.costLogs]
    });
  }

  restore(snap) {
    const d = JSON.parse(snap);
    this.wallets = new Map(d.wallets);
    this.buckets = new Map(d.buckets);
    this.transactions = new Map(d.transactions);
    this.reservations = new Map(d.reservations);
    this.costLogs = [...d.costLogs];
  }

  reserve(userId, amount, refType, refId) {
    const snap = this.snapshot();
    try {
      if (!amount || amount <= 0) throw new Error("p_amount must be positive");
      
      const wallet = Array.from(this.wallets.values()).find(w => w.user_id === userId);
      if (!wallet) throw new Error("Wallet not found");

      // Idempotency check
      if (refType && refId) {
        const existing = Array.from(this.transactions.values()).find(
          t => t.user_id === userId && t.reference_type === refType && t.reference_id === refId && ['PENDING', 'COMPLETED'].includes(t.status)
        );
        if (existing) {
          return { success: true, transactionId: existing.id, idempotent: true };
        }
      }

      const available = wallet.balance_credits - wallet.reserved_credits;
      if (available < amount) return { success: false, reason: "Insufficient credits" };

      const txId = 'tx-' + Math.random().toString(36).substring(2, 9);
      this.transactions.set(txId, {
        id: txId,
        wallet_id: wallet.id,
        user_id: userId,
        amount: -amount,
        reference_type: refType,
        reference_id: refId,
        status: 'PENDING',
        provider: 'openrouter',
        feature: 'Render'
      });

      // Allocate buckets
      let remaining = amount;
      const validBuckets = Array.from(this.buckets.values())
        .filter(b => b.wallet_id === wallet.id && (!b.expires_at || new Date(b.expires_at) > new Date()));

      for (const b of validBuckets) {
        if (remaining <= 0) break;
        const resAmt = Math.min(remaining, b.balance);
        const resId = 'res-' + Math.random().toString(36).substring(2, 9);
        this.reservations.set(resId, {
          id: resId,
          wallet_id: wallet.id,
          wallet_transaction_id: txId,
          bucket_id: b.id,
          reserved_amount: resAmt,
          status: 'ACTIVE'
        });
        remaining -= resAmt;
      }

      if (remaining > 0) throw new Error("CRITICAL: Bucket math mismatch");

      wallet.reserved_credits += amount;
      return { success: true, transactionId: txId, idempotent: false };
    } catch (e) {
      this.restore(snap);
      throw e;
    }
  }

  commit(txId, actualUsdCost = 0, failCostLogInsert = false) {
    const snap = this.snapshot();
    try {
      const tx = this.transactions.get(txId);
      if (!tx || tx.status !== 'PENDING') return false;

      const wallet = this.wallets.get(tx.wallet_id);
      if (!wallet) return false;

      const amount = Math.abs(tx.amount);
      const activeRes = Array.from(this.reservations.values())
        .filter(r => r.wallet_transaction_id === txId && r.status === 'ACTIVE');

      const sumRes = activeRes.reduce((acc, r) => acc + r.reserved_amount, 0);
      if (sumRes !== amount) {
        throw new Error(`CRITICAL: Reservation discrepancy (expected ${amount}, got ${sumRes})`);
      }

      if (wallet.reserved_credits < amount) {
        throw new Error(`CRITICAL: Wallet reserved_credits underflow (${wallet.reserved_credits} < ${amount})`);
      }

      for (const r of activeRes) {
        const bucket = this.buckets.get(r.bucket_id);
        if (!bucket) throw new Error("Bucket not found");
        if (bucket.balance < r.reserved_amount) {
          throw new Error(`Bucket insufficient balance (${bucket.balance} < ${r.reserved_amount})`);
        }
        bucket.balance -= r.reserved_amount;
        r.status = 'COMMITTED';
      }

      // Re-sum valid unexpired buckets
      const totalBal = Array.from(this.buckets.values())
        .filter(b => b.wallet_id === wallet.id && (!b.expires_at || new Date(b.expires_at) > new Date()))
        .reduce((acc, b) => acc + b.balance, 0);

      wallet.balance_credits = totalBal;
      wallet.reserved_credits -= amount;
      wallet.lifetime_used += amount;
      wallet.total_consumed_credits += amount;

      tx.status = 'COMPLETED';
      tx.balance_after = totalBal;

      if (actualUsdCost !== null) {
        if (actualUsdCost < 0) throw new Error("p_actual_usd_cost cannot be negative");
        if (failCostLogInsert) throw new Error("Simulated DB error inserting into provider_cost_logs");
        this.costLogs.push({ txId, cost: actualUsdCost });
      }

      return true;
    } catch (e) {
      this.restore(snap);
      throw e;
    }
  }

  release(txId, reason = 'Released') {
    const snap = this.snapshot();
    try {
      const tx = this.transactions.get(txId);
      if (!tx || tx.status !== 'PENDING') return false;

      const wallet = this.wallets.get(tx.wallet_id);
      if (!wallet) return false;

      const amount = Math.abs(tx.amount);
      const activeRes = Array.from(this.reservations.values())
        .filter(r => r.wallet_transaction_id === txId && r.status === 'ACTIVE');

      const sumRes = activeRes.reduce((acc, r) => acc + r.reserved_amount, 0);
      if (sumRes !== amount) {
        throw new Error(`CRITICAL: Reservation discrepancy on release`);
      }

      if (wallet.reserved_credits < amount) {
        throw new Error(`CRITICAL: Wallet reserved_credits underflow on release`);
      }

      for (const r of activeRes) {
        r.status = 'RELEASED';
      }

      wallet.reserved_credits -= amount;
      tx.status = 'CANCELLED';
      tx.description = (tx.description || '') + ' | ' + reason;

      return true;
    } catch (e) {
      this.restore(snap);
      throw e;
    }
  }
}

// Export for integration test runners
module.exports = { StagingSimulationEngine };
