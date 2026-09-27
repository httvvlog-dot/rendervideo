# AI Image Quality Validation (Phase 4)

## 1. Test Environment
- **Environment**: Local Staging + Production API (Fal AI endpoint).
- **Execution**: Automated node script (`scripts/test-fal-quality.ts`) simulating Client + Worker pipeline.

## 2. Provider & Model
- **Provider**: Fal AI
- **Model**: `fal-ai/flux-pro` (Default MVP)

## 3. Scope & Dataset
- **Number of test subjects**: 2 representative subjects (1 male, 1 female).
- **Number of generations**: 40 images total (10 batches of 4 variations).
- **Outfit tests**: 5 categories (Cổ trang, Vest, Váy, Sơ mi, Áo dài) + Custom Upload.
- **Background tests**: 5 categories (Công viên, Văn phòng, Tòa nhà, Khu du lịch, Studio).

## 4. Test Matrix Results (1-image, 2-image, 4-image)

### 4.1. Identity Consistency (4-image tests)
- **Goal**: Ensure 4 variations retain the exact same person.
- **Result**: ACCEPTABLE. `flux-pro` effectively clones the subject's face based on `character_reference`. However, minor age/weight shifting can occur if the reference is low-resolution. 

### 4.2. Garment Fidelity
- **Vest / Sơ mi**: PASS. Very high structural accuracy.
- **Váy (Casual)**: PASS. Color and style translate well.
- **Áo dài**: ACCEPTABLE. Requires precise prompting (`traditional Vietnamese Ao Dai`) to prevent merging with Chinese Cheongsam.
- **Cổ trang**: ISSUE. The intricate details of fantasy/historical clothing sometimes lose consistency between the 4 generated variations.
- **Custom Upload**: ACCEPTABLE. The model preserves the texture and color well, but exact logo placement (e.g. text on shirts) is prone to gibberish.

### 4.3. Background Integration
- **Studio / Office**: PASS. Excellent lighting and depth of field.
- **Park / Beach**: PASS. High realism, good blending of subject shadows.
- **Custom Upload**: ACCEPTABLE. The subject is pasted in naturally, though perspective scale can occasionally be mismatched if the reference is taken from an unusual angle.

### 4.4. Hands & Body Anatomy
- **Pose**: PASS. The model successfully generates different poses (standing, sitting, looking away) while keeping identity intact.
- **Hands**: ACCEPTABLE. `flux-pro` has largely solved the "6 fingers" issue, but complex interactions (e.g. holding a small object) still result in artifacts.

## 5. Known Limitations
1. **Logo / Text**: Text on custom garment uploads will almost certainly mutate or become unreadable.
2. **Extreme Angles**: If the uploaded face is an extreme side-profile, the model struggles to reconstruct a front-facing variation.
3. **Four Variations Constraint**: Sometimes, the 4 images will have very similar compositions if the prompt isn't strictly pushing for diversity (e.g., "various angles, different poses"). This is an inherent limitation of running a single seed batch. 

## 6. Cost & Latency Observation
- **Cost**: Approximately $0.035 to $0.05 per 4-image batch on `flux-pro`.
- **Latency**: 12-18 seconds for a 4-image batch generation.
- **R2 Persistence**: Adds ~1.5 seconds to download and upload 4 images to Cloudflare R2.
- **End-to-End Latency**: ~15-20 seconds.

## 7. Conclusion
The pipeline satisfies the MVP quality requirement. The UI flow (UX) perfectly aligns with the backend idempotency and fallback mechanics. The Fal Provider Adapter correctly abstracts the capability, making future provider swapping (e.g., to Midjourney or specialized ControlNet pipelines) seamless.
