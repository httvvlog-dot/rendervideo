# Capability-Based Model Selection Implementation
Project: Hatara Studio / RenderVideo

## Scope of Changes
This implementation refactors the `ProviderRuntime` and `BillingEngine` to allow a single provider credential (e.g., OpenRouter) to serve different models across different system capabilities (Script vs. Image), without hardcoding models into the source code and maintaining strict transaction-safe billing.

## 1. Provider Runtime (`src/utils/provider-runtime/index.ts`)
- **Changes**: Refactored `ProviderRuntime.getDefaultModel(capability?: string)` to support capability resolution.
- **Resolver Behavior**:
  1. Checks `config_json.models[capability]` (e.g. `IMAGE` or `SCRIPT`).
  2. Falls back to `config_json.default_model`.
  3. Falls back to system default.
- **Impact**: Enables `ProviderRuntime("openrouter").getDefaultModel("IMAGE")` to fetch the specific AI Image model configured by the Admin, avoiding hardcoded models in the Image worker.

## 2. Admin UI (`src/app/admin/providers/[id]/components/forms/openrouter-form.tsx`)
- **Changes**: Replaced the single "Default Model" dropdown with a capability-aware layout.
- **Capabilities Configured**:
  - `SCRIPT`: Filters out models with `architecture.modality.includes("image")` for cleaner UI selection.
  - `IMAGE`: Allows selecting an image generation model (e.g., `google/gemini-3.1-flash-image-preview`).
  - `Fallback Model`: Acts as the legacy `default_model` catch-all.
- **Impact**: Saves models directly into `provider_credentials.config_json` under a `models` mapping, preserving the API key structure.

## 3. Billing Engine (`src/utils/billing/BillingEngine.ts`) - P0
- **Changes**: Refactored `getChargeInfo` to intercept `IMAGE_GENERATION` and resolve the model dynamically via `ProviderRuntime` BEFORE trusting the static mapping in `ai_plan_profiles`.
- **Billing Behavior**:
  1. If Admin overrides the `IMAGE` model via `ProviderRuntime` capability, `BillingEngine` dynamically resolves the pricing for THAT specific model via `provider_model_pricing` cache.
  2. If pricing (`api_cost`) or credit rules (`credit_cost`) are missing for the Admin-selected model, it THROWS a `BILLING_PRICING_MISSING` error.
  3. Returns `pricingVersion` and dynamic `credits` strictly tied to the *actual model used*, ensuring zero billing desync.
- **Transaction Safety**: Maintains idempotency. Model is resolved once during `reserve`, recorded in the transaction, and frozen.

## 4. Business Logic Cleanup
- **Web Research**: `script-actions.ts` refactored to use `await runtime.getDefaultModel("RESEARCH") || "perplexity/sonar"`.
- **Script Generation**: `script-actions.ts` refactored to use `await runtime.getDefaultModel("SCRIPT")`.
- **Prompt Validator**: `prompt-validator.ts` refactored to use `await runtime.getDefaultModel("SCRIPT")`.

## 5. Security & Fallbacks
- **Security**: No API keys exposed. Credential payload strictly masks `apiKey` before returning to client components in `getOpenRouterModels`.
- **Backward Compatibility**: If `models` map is absent from an older credential, it gracefully falls back to `default_model`, satisfying RenderVideo / legacy requirements.

## 6. Tests Executed (Regression Safety)
- [x] Typecheck (`npx tsc --noEmit`) - PASS
- [x] Lint (`npm run lint`) - PASS
- [x] Billing Capability Fallback - PASS (safely rejects missing pricing)
- [x] Modality Filtering - PASS (Image models filtered from text inputs based on `architecture.modality`)

---

AUDIT STATUS:
PASS

NEXT PHASE:
Configure Admin:
SCRIPT → existing text model
IMAGE → google/gemini-3.1-flash-image-preview
