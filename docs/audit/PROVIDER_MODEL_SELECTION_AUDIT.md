# Provider Model Selection Audit

## 1. Current Architecture
The current provider and model resolution architecture is fragmented across different flows.
- **Script/Text** relies on a global `default_model` defined inside the `provider_credentials` JSON config.
- **AI Image** bypasses `provider_credentials` model settings completely and relies on the `ai_plan_profiles` table to resolve both the provider and the model based on the user's billing plan.
- **Render Video** relies heavily on predefined FFmpeg timeline codecs rather than AI generation models.

## 2. Render Video Model Flow
- User action → `api/render` → `src/worker/render-worker.ts`
- Provider Resolver: Hardcoded to local system execution (FFmpeg / Remotion).
- Credential Resolver: N/A
- Model Resolver: Hardcoded to `job.timeline_snapshot.preset.codec || "h264"` inside `render-worker.ts`.
- OpenRouter: Not utilized.
- Model ID thực tế: `h264` (Codec, not an AI model).

## 3. Script/Text Model Flow
- User action → `src/app/(user)/projects/[id]/script-actions.ts`
- Provider Resolver: Hardcoded instantiation: `new ProviderRuntime("openrouter")`.
- Credential Resolver: `ProviderRuntime.selector.getActiveCredentials()` fetches active credentials for "openrouter".
- Model Resolver: `await runtime.getDefaultModel() || "openai/gpt-4o-mini"`. This reads `provider_credentials.config_json.default_model`.
- OpenRouter: Yes, via `OpenRouterAdapter`.
- Model ID thực tế: Resolved from the credential's `default_model`, but explicitly overridden as `"perplexity/sonar"` for the Web Research step.

## 4. AI Image Model Flow
- User action → `src/app/(user)/projects/[id]/image-actions.ts` → `src/worker/image-worker.ts`
- Provider & Model Resolver: `BillingEngine.executeAndCharge` calls `BillingEngine.getChargeInfo`.
- `getChargeInfo` queries `ai_plan_profiles` matching `plan_key` + `capability = 'IMAGE_GENERATION'`, retrieving `providers(provider_key)` and `ai_models(api_slug)`.
- Image Adapter: `AdapterRegistry.get(provider)`.
- Credential Resolver: Fetches credentials based on the resolved `providerKey`.
- OpenRouter: Yes (if Fal.ai or OpenRouter is configured in `ai_plan_profiles`).
- Model ID thực tế: Resolved entirely from the `ai_plan_profiles` database mapping, ignoring the credential's `default_model`.

## 5. Current Database Model
- `providers`
- `provider_credentials`
- `ai_models`
- `ai_plan_profiles`
The database has the capacity to represent capability isolation via `ai_plan_profiles` (which uses a `capability` column). However, to allow an Admin to configure capability models *per credential* (e.g. one OpenRouter key serving 3 distinct capabilities independently), the `provider_credentials.config_json` schema must be updated. Currently, it only supports a flat `default_model` string.

## 6. Current Admin UI
- Location: `/admin/providers/[id]/components/forms/openrouter-form.tsx`
- The `Default Model` field serves as a global fallback model for the credential.
- It cannot currently be expanded to capability-based selection without structural changes.
- UI Target Proposal:
```text
Credential: taovideo key2
API Key: **************
Capabilities:
🎬 Render Video [ Model A ▼ ]
📝 Tạo kịch bản [ Model B ▼ ]
🖼️ AI Image [ Model C ▼ ]
[Load Models]
```

## 7. Current OpenRouter Model Loading
- API Endpoint: `src/app/admin/providers/actions.ts` → `getOpenRouterModels` fetches `https://openrouter.ai/api/v1/models`.
- The current implementation dumps the entire list indiscriminately.
- It does not check capability, cache results, or filter models by modality (Text vs Image vs Video).

## 8. Hard-coded Model Findings

ID: PMS-001
Severity: P1
Title: Hard-coded Web Search Model in Script Actions
Evidence: `src/app/(user)/projects/[id]/script-actions.ts` -> `model: "perplexity/sonar"`
Impact: Web search strictly uses Perplexity Sonar. Admin cannot change this via the UI without a code change.
Recommended Action: Remove hard-coded string and rely on a capability-based resolution (e.g., `capability: "RESEARCH"`).
Implementation Priority: Medium

ID: PMS-002
Severity: P2
Title: Hard-coded Fallback Model in Prompt Validator
Evidence: `src/utils/prompt-validator.ts` -> `"openai/gpt-4o-mini"`
Impact: Fallback explicitly points to an OpenAI model via OpenRouter.
Recommended Action: Replace with capability-resolved fallback.
Implementation Priority: Low

## 9. Capability Separation Findings

ID: PMS-003
Severity: P0
Title: Global Default Model prevents Capability Multiplexing
Evidence: `provider_credentials.config_json.default_model` used in `ProviderRuntime.getDefaultModel()`.
Impact: Changing the `default_model` for an OpenRouter credential globally affects any flow relying on `getDefaultModel()`. One OpenRouter credential cannot serve distinct models for Text vs Video vs Image through the Admin UI.
Recommended Action: Migrate `config_json` to support a nested `models` object keyed by capability.
Implementation Priority: High

## 10. Backward Compatibility
To avoid breaking existing RenderVideo and Script flows, fallback logic must be implemented in the model resolver:
```typescript
const modelId = config.models?.[capability] 
             || config.default_model 
             || config.defaultModel 
             || systemDefaultFallback;
```
This ensures credentials without capability-specific overrides continue to function.

## 11. Security
- API keys are securely handled on the backend and not exposed to the client.
- Model configuration changes are protected by `requireAdmin()`.
- RLS policies on `provider_credentials` correctly prevent unauthorized mutation.

## 12. Billing / Pricing Impact

ID: PMS-004
Severity: P0
Title: Billing Desync Risk with Capability Model Overrides
Evidence: `src/utils/billing/BillingEngine.ts` -> `getChargeInfo()`
Impact: AI Image billing relies on `ai_plan_profiles` mapping to resolve both the model and the cost (`credits_per_unit`). If model selection is decoupled and moved to the *Credential* layer via Admin UI, the billing engine will charge incorrect amounts if it doesn't dynamically resolve the price of the actual model used.
Recommended Action: Refactor `getChargeInfo` to resolve cost based on `model` + `pricing_version` + `capability`, referencing `provider_model_pricing` instead of static plan profiles.
Implementation Priority: Critical

## 13. Recommended Target Architecture
Provider
  ↓
Credential
  ↓
Capability
  ├── VIDEO → model
  ├── SCRIPT → model
  └── IMAGE → model

One OpenRouter API key can be routed to multiple independent models based on capability context.

## 14. Required DB Changes
- No schema table changes required.
- Update `provider_credentials.config_json` schema logic to support:
```json
{
  "models": {
    "VIDEO": "model-a",
    "SCRIPT": "model-b",
    "IMAGE": "model-c"
  }
}
```

## 15. Required API Changes
- Update `ProviderRuntime.getDefaultModel(capability?: string)` to accept a capability flag and resolve the nested map.

## 16. Required Admin UI Changes
- Modify `openrouter-form.tsx` to render capability-specific dropdowns.
- Implement model catalog filtering (by Modality/Architecture) after fetching from OpenRouter.

## 17. Required Provider Adapter Changes
- Ensure `OpenRouterAdapter` and others respect the capability argument passed through `ExecuteParams`.

## 18. Migration Strategy
1. Introduce capability parameter to `ProviderRuntime.getDefaultModel`.
2. Update Admin UI to save capability maps to `config_json`.
3. Keep `default_model` intact as a strict fallback.

## 19. Risks
- Modifying `BillingEngine` to support dynamic model pricing poses a high risk to revenue calculations and wallet balances. Thorough tests are required before deployment.

## 20. Recommended Implementation Order
1. Billing logic update (Pricing dynamic resolution).
2. Runtime `getDefaultModel(capability)` support.
3. Admin UI `openrouter-form.tsx` overhaul.
4. Purge hardcoded model strings in business logic.

---

AUDIT STATUS:
PASS WITH FINDINGS

NEXT PHASE:
"Capability-Based Model Selection Implementation"
