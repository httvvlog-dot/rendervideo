import { NextResponse } from "next/server";
import { HealthService } from "@/utils/diagnostics";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const health = await HealthService.getHealth(true); // Force run fresh checks
    
    // 1. Database Info
    let migrationCount = 0;
    let latestMigration = "UNKNOWN";
    try {
      const { data: migrations } = await supabase.from('supabase_migrations.schema_migrations').select('version').order('version', { ascending: false });
      if (migrations && migrations.length > 0) {
        migrationCount = migrations.length;
        latestMigration = migrations[0].version;
      }
    } catch (e) {
      // Ignored for now if we can't read it
    }

    // 2. Providers Info
    let providersList = [];
    try {
      const { data: providers } = await supabase.from('providers').select('id, provider_key, is_active, display_name');
      if (providers) {
        for (const p of providers) {
          const { count: credCount } = await supabase.from('provider_credentials').select('*', { count: 'exact', head: true }).eq('provider_id', p.id);
          const { count: modelCount } = await supabase.from('ai_models').select('*', { count: 'exact', head: true }).eq('provider_id', p.id).eq('is_active', true);
          
          providersList.push({
            provider: p.provider_key,
            enabled: p.is_active,
            credentials: credCount || 0,
            models: modelCount || 0
          });
        }
      }
    } catch (e) {}

    // 3. Billing Info (Simulated for FREE tier)
    let billingInfo = { resolved_plan: "UNKNOWN", resolved_provider: "UNKNOWN", resolved_model: "UNKNOWN" };
    try {
      const { data: profile } = await supabase.from('ai_plan_profiles')
        .select('provider_id, ai_model_id, providers(provider_key), ai_models(api_slug)')
        .eq('plan_key', 'FREE')
        .eq('capability', 'IMAGE_GENERATION')
        .eq('is_active', true)
        .single();
        
      if (profile) {
        billingInfo = {
          resolved_plan: "FREE",
          resolved_provider: Array.isArray(profile.providers) ? profile.providers[0]?.provider_key : (profile.providers as any)?.provider_key,
          resolved_model: Array.isArray(profile.ai_models) ? profile.ai_models[0]?.api_slug : (profile.ai_models as any)?.api_slug
        };
      }
    } catch(e) {}

    // 4. Runtime Info
    let runtimeInfo = { provider: billingInfo.resolved_provider, endpoint: `https://queue.fal.run/${billingInfo.resolved_model}`, healthy: false };
    try {
       if (health.components.fal?.status === "OK") {
         runtimeInfo.healthy = true;
       }
    } catch(e) {}

    const debugResponse = {
      overall_status: health.status,
      timestamp: new Date(health.lastChecked).toISOString(),
      database: {
        project_ref: process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL.replace("https://", "").split(".")[0] : "UNKNOWN",
        migration_count: migrationCount,
        latest_migration: latestMigration,
        status: health.components.database?.status || "UNKNOWN",
        message: health.components.database?.message || "OK"
      },
      schema: {
        status: health.components.schema?.status || "UNKNOWN",
        message: health.components.schema?.message || "OK",
        details: health.components.schema?.details || null
      },
      providers: providersList,
      billing: billingInfo,
      runtime: runtimeInfo,
      environment: {
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "MISSING",
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV || "local"
      },
      raw_health_state: health
    };
    
    return NextResponse.json(debugResponse);
  } catch (error: any) {
    return NextResponse.json({ 
      overall_status: "CRASH",
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
