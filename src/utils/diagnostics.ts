import { createClient } from "./supabase/server";
import requiredMigrations from "../../config/required-migrations.json";

export type Status = "OK" | "ERROR" | "WARNING" | "UNKNOWN";

export interface InfrastructureHealth {
  database: Status;
  schema: Status;
  storage: Status;
  databaseDetails?: any;
  schemaDetails?: any;
  storageDetails?: any;
}

export interface ProviderHealth {
  fal: Status;
  openrouter: Status;
  elevenlabs: Status;
  falDetails?: any;
  openrouterDetails?: any;
  elevenlabsDetails?: any;
}

export interface HealthStateV2 {
  appVersion: string;
  lastChecked: number;
  infrastructure: InfrastructureHealth;
  providers: ProviderHealth;
}

let healthCacheV2: HealthStateV2 | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute for health check

export class HealthService {
  
  static async getHealth(force: boolean = false): Promise<HealthStateV2> {
    const now = Date.now();
    if (!force && healthCacheV2 && (now - healthCacheV2.lastChecked) < CACHE_TTL_MS) {
      return healthCacheV2;
    }

    const state: HealthStateV2 = {
      appVersion: "2.3.0",
      lastChecked: now,
      infrastructure: { database: "UNKNOWN", schema: "UNKNOWN", storage: "UNKNOWN" },
      providers: { fal: "UNKNOWN", openrouter: "UNKNOWN", elevenlabs: "UNKNOWN" }
    };

    // Infrastructure checks
    const dbRes = await this.testDatabase();
    state.infrastructure.database = dbRes.status;
    state.infrastructure.databaseDetails = dbRes;

    const schemaRes = await this.testSchema();
    state.infrastructure.schema = schemaRes.status;
    state.infrastructure.schemaDetails = schemaRes;

    const storageRes = await this.testStorageConfig();
    state.infrastructure.storage = storageRes.status;
    state.infrastructure.storageDetails = storageRes;

    // Provider checks (Config only for fast health check)
    const falRes = await this.testProviderConfig("fal");
    state.providers.fal = falRes.status;
    state.providers.falDetails = falRes;

    const orRes = await this.testProviderConfig("openrouter");
    state.providers.openrouter = orRes.status;
    state.providers.openrouterDetails = orRes;

    // TODO: elevenlabs
    state.providers.elevenlabs = "UNKNOWN";

    healthCacheV2 = state;
    return state;
  }

  static async runAllTests(): Promise<HealthStateV2> {
    const state = await this.getHealth(true);
    
    // Deep ping providers
    const falPing = await this.testProviderPing("fal");
    state.providers.fal = falPing.status;
    state.providers.falDetails = falPing;

    const orPing = await this.testProviderPing("openrouter");
    state.providers.openrouter = orPing.status;
    state.providers.openrouterDetails = orPing;

    state.lastChecked = Date.now();
    healthCacheV2 = state;
    return state;
  }

  static async testDatabase(): Promise<{ status: Status, latencyMs?: number, message?: string }> {
    const now = Date.now();
    try {
      const supabase = await createClient();
      const { error } = await supabase.from("projects").select("id").limit(1);
      const latency = Date.now() - now;
      if (error) throw error;
      return { status: "OK", latencyMs: latency };
    } catch (e: any) {
      return { status: "ERROR", message: e.message };
    }
  }

  static async testSchema(): Promise<{ status: Status, message?: string, missing?: string[] }> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc('get_applied_migrations');
        
      if (error) {
        return { status: "ERROR", message: "Could not read migrations (RPC missing?): " + error.message };
      }

      const appliedVersions = (data || []).map((row: any) => row.version);
      
      const missing = [];
      for (const req of requiredMigrations.required) {
        const verNumber = req.split('_')[0];
        if (!appliedVersions.includes(verNumber)) {
          missing.push(req);
        }
      }

      if (missing.length > 0) {
        return { status: "ERROR", message: "Missing migrations", missing };
      }

      return { status: "OK" };
    } catch (e: any) {
      return { status: "ERROR", message: e.message };
    }
  }

  static async testStorageConfig(): Promise<{ status: Status, message?: string }> {
    try {
      const supabase = await createClient();
      const { error } = await supabase.storage.getBucket("project-media");
      if (error && error.message.includes("Invalid bucket")) {
         return { status: "ERROR", message: "Bucket project-media not found" };
      }
      return { status: "OK" };
    } catch (e: any) {
      return { status: "ERROR", message: e.message };
    }
  }

  static async testProviderConfig(provider: string): Promise<{ status: Status, message?: string }> {
    const isFal = provider === "fal";
    const key = isFal ? process.env.FAL_KEY : process.env.OPENROUTER_API_KEY;
    if (!key) {
      return { status: "ERROR", message: "Missing API Key" };
    }
    return { status: "OK", message: "Configured" };
  }

  static async testProviderPing(provider: string): Promise<{ status: Status, latencyMs?: number, message?: string }> {
    const now = Date.now();
    const key = provider === "fal" ? process.env.FAL_KEY : process.env.OPENROUTER_API_KEY;
    if (!key) {
      return { status: "ERROR", message: "Missing API Key" };
    }
    
    try {
      let res;
      if (provider === "fal") {
        res = await fetch("https://queue.fal.run/fal-ai/flux-pro", { method: "OPTIONS" });
      } else {
        res = await fetch("https://openrouter.ai/api/v1/auth/key", { 
          headers: { "Authorization": `Bearer ${key}` }
        });
      }
      
      const latency = Date.now() - now;
      if (!res.ok) {
         return { status: "ERROR", latencyMs: latency, message: `HTTP ${res.status}` };
      }
      return { status: "OK", latencyMs: latency };
    } catch (e: any) {
      return { status: "ERROR", message: e.message };
    }
  }
}
