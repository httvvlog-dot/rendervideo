import { createAdminClient } from "@/utils/supabase/admin";
import { BillingEngine, BillingFeature } from "@/utils/billing";
import { ProviderRuntime } from "@/utils/provider-runtime";
import { AdapterRegistry } from "@/utils/provider-runtime/adapters/factory";
import { ImageProviderAdapter } from "@/utils/provider-runtime/adapters/image-adapters";

async function runTrace() {
  console.log("=== RUNTIME TRACE START ===");
  const supabase = createAdminClient();
  
  // 1. Find a test project and user
  const { data: project } = await supabase.from('projects').select('id, user_id').limit(1).single();
  if (!project) {
    console.log("No test project found.");
    return;
  }
  
  const projectId = project.id;
  const userId = project.user_id;
  
  console.log(`1. Resolved User: ${userId}`);
  
  // Fetch user's actual image tier
  const { data: profileData } = await supabase.from('profiles').select('image_tier').eq('id', userId).single();
  const planKey = profileData?.image_tier ? profileData.image_tier.toUpperCase() : 'FREE';
  console.log(`2. Resolved Plan: ${planKey}`);

  // Fetch the expected DB model resolution to verify it matches
  const { data: profile } = await supabase.from('ai_plan_profiles')
    .select('provider_id, ai_model_id, providers(provider_key), ai_models(api_slug)')
    .eq('plan_key', planKey)
    .eq('capability', 'IMAGE_GENERATION')
    .eq('is_active', true)
    .single();
    
  if (profile) {
    const pKey = Array.isArray(profile.providers) ? profile.providers[0]?.provider_key : (profile.providers as any)?.provider_key;
    const mSlug = Array.isArray(profile.ai_models) ? profile.ai_models[0]?.api_slug : (profile.ai_models as any)?.api_slug;
    console.log(`3. Database Resolved Provider: ${pKey}`);
    console.log(`4. Database Resolved Model: ${mSlug}`);
  } else {
    console.log(`3/4. Missing DB Profile for Plan: ${planKey}`);
  }

  // 2. Billing Engine Execute
  const context = {
    userId,
    projectId,
    feature: BillingFeature.IMAGE_GENERATION
  };

  try {
    const chargeResult = await BillingEngine.getChargeInfo(context.feature, undefined, undefined, context.userId);
    console.log(`5. BillingEngine Resolved Provider: ${chargeResult.provider}`);
    console.log(`6. BillingEngine Resolved Model: ${chargeResult.model}`);
    
    // Simulate adapter execution to capture credentials and endpoint
    const provider = chargeResult.provider;
    const model = chargeResult.model;
    
    const adapter = AdapterRegistry.get(provider) as unknown as ImageProviderAdapter;
    const runtime = new ProviderRuntime(provider, { retryCount: 0 });
    
    // Patch FalClient run to intercept payload and response
    const origFetch = global.fetch;
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      console.log(`7. HTTP Endpoint: ${input}`);
      if (init && init.body) {
         console.log(`8. Request Payload:`, JSON.parse(init.body as string));
      }
      if (init && init.headers) {
         const headers = init.headers as any;
         if (headers['Authorization']) {
            console.log(`9. Credential Key: ${headers['Authorization'].substring(0, 10)}... (masked)`);
         }
      }
      
      const res = await origFetch(input, init);
      console.log(`10. HTTP Status: ${res.status}`);
      
      // Clone response to read text
      const cloned = res.clone();
      try {
        const text = await cloned.text();
        console.log(`11. Response Body:`, JSON.parse(text));
      } catch (e) {
        console.log(`11. Response Body (Text):`, cloned.text());
      }
      
      return res;
    };
    
    // Run the adapter
    console.log("--> Calling adapter.generate()...");
    const aiResult = await runtime.invoke(
      async (cred) => {
        console.log(`12. Selected Credential ID: ${cred.id}`);
        // Only run mock mode for trace if real execution would cost too much
        process.env.IMAGE_PROVIDER_MODE = "mock";
        return adapter.generate(cred, { prompt: "Test prompt", width: 1080, height: 1920, model });
      }, 
      { step: "IMAGE", projectId }
    );
    
    console.log(`13. React State Update Payload:`, { success: true, url: aiResult.result.url, width: aiResult.result.width, height: aiResult.result.height });
    
  } catch (error: any) {
    console.error("Trace failed with Error:", error.message);
  }
}

runTrace();
