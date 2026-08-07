# Hatara Studio Scripts

This directory contains internal maintenance, administration, and diagnostic tools for the Hatara Studio ecosystem. These scripts run entirely outside the Next.js runtime and are completely decoupled from production application processes.

## Directory Structure

- **`doctor/`**
  System diagnosis and health check utilities.

- **`repair/`**
  Safe repair scripts and automatic fixers for system discrepancies.

- **`billing/`**
  Wallet tools, credit management, and billing system reconciliations.

- **`migration/`**
  SQL migration helpers and database schema maintenance scripts.

- **`seed/`**
  Seed data and initial state generation tools.

- **`benchmark/`**
  Performance tests, load testing, and speed benchmarking.

- **`debug/`**
  Internal debugging tools only (sandbox environments, ad-hoc queries).

---
*Note: This entire directory is globally ignored by ESLint to keep the main application linting clean, and it does not participate in Next.js builds.*
