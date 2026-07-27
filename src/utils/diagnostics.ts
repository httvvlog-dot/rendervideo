import { createClient } from "./supabase/server";
import requiredMigrations from "../../config/required-migrations.json";

export type Severity = "Critical" | "Warning" | "Info";
export type Status = "OK" | "ERROR" | "UNKNOWN";

export interface HealthComponent {
  name: string;
  status: Status;
  severity: Severity;
  lastChecked: number;
  latencyMs?: number;
  message?: string;
  details?: any;
}

export interface HealthState {
  appVersion: string;
  status: "OK" | "UPGRADE_REQUIRED" | "ERROR" | "WARNING";
  components: Record<string, HealthComponent>;
  lastChecked: number;
}

let healthCache: HealthState | null = null;
const CACHE_TTL_MS = 300 * 1000; // 5 minutes

export class HealthService {
  
  static async getHealth(force: boolean = false): Promise<HealthState> {
    const now = Date.now();
    if (!force && healthCache && (now - healthCache.lastChecked) < CACHE_TTL_MS) {
      return healthCache;
    }

    const state: HealthState = {
      appVersion: "2.3.0",
      status: "OK",
      components: {},
      lastChecked: now
    };

    // Run basic startup checks (DB, Schema, Storage Configuration)
    // We do NOT ping providers here to avoid timeout blocking.
    state.components.database = await this.testDatabase();
    state.components.schema = await this.testSchema();
    state.components.storage = await this.testStorageConfig();
    state.components.fal = await this.testProviderConfig("fal");
    state.components.openrouter = await this.testProviderConfig("openrouter");

    // Determine overall status
    const criticals = Object.values(state.components).filter(c => c.severity === "Critical" && c.status !== "OK");
    const warnings = Object.values(state.components).filter(c => c.severity === "Warning" && c.status !== "OK");

    if (criticals.length > 0) {
      state.status = criticals.some(c => c.name === "Schema") ? "UPGRADE_REQUIRED" : "ERROR";
    } else if (warnings.length > 0) {
      state.status = "WARNING";
    }

    healthCache = state;
    return state;
  }

  static async runAllTests(): Promise<HealthState> {
    const state = await this.getHealth(true);
    // Add runtime pings
    state.components.fal = await this.testProviderPing("fal");
    state.components.openrouter = await this.testProviderPing("openrouter");
    
    const now = Date.now();
    state.lastChecked = now;
    
    const criticals = Object.values(state.components).filter(c => c.severity === "Critical" && c.status !== "OK");
    const warnings = Object.values(state.components).filter(c => c.severity === "Warning" && c.status !== "OK");

    if (criticals.length > 0) {
      state.status = criticals.some(c => c.name === "Schema") ? "UPGRADE_REQUIRED" : "ERROR";
    } else if (warnings.length > 0) {
      state.status = "WARNING";
    } else {
      state.status = "OK";
    }

    healthCache = state;
    return state;
  }

  static async testDatabase(): Promise<HealthComponent> {
    const now = Date.now();
    try {
      const supabase = await createClient();
      // Simple query to verify connection
      const { error } = await supabase.from("projects").select("id").limit(1);
      const latency = Date.now() - now;
      if (error) throw error;
      return { name: "Database", status: "OK", severity: "Critical", lastChecked: now, latencyMs: latency };
    } catch (e: any) {
      return { name: "Database", status: "ERROR", severity: "Critical", lastChecked: now, message: e.message };
    }
  }

  static async testSchema(): Promise<HealthComponent> {
    const now = Date.now();
    try {
      const supabase = await createClient();
      // Query via RPC since supabase_migrations is not exposed to PostgREST
      const { data, error } = await supabase.rpc('get_applied_migrations');
        
      if (error) {
        // If the RPC doesn't exist, we know the schema is outdated
        return { name: "Schema", status: "ERROR", severity: "Critical", lastChecked: now, message: "Could not read migrations (RPC missing?): " + error.message };
      }

      const appliedVersions = (data || []).map(row => row.version);
      
      const missing = [];
      for (const req of requiredMigrations.required) {
        // Required version is just the leading numbers
        const verNumber = req.split('_')[0];
        if (!appliedVersions.includes(verNumber)) {
          missing.push(req);
        }
      }

      if (missing.length > 0) {
        return { 
          name: "Schema", 
          status: "ERROR", 
          severity: "Critical", 
          lastChecked: now, 
          message: "Missing migrations", 
          details: { missing } 
        };
      }

      return { name: "Schema", status: "OK", severity: "Critical", lastChecked: now };
    } catch (e: any) {
      return { name: "Schema", status: "ERROR", severity: "Critical", lastChecked: now, message: e.message };
    }
  }

  static async testStorageConfig(): Promise<HealthComponent> {
    const now = Date.now();
    try {
      // Just check if bucket is accessible or config is set
      const supabase = await createClient();
      const { data, error } = await supabase.storage.getBucket("project-media");
      if (error && error.message.includes("Invalid bucket")) {
         return { name: "Storage", status: "ERROR", severity: "Critical", lastChecked: now, message: "Bucket project-media not found" };
      }
      return { name: "Storage", status: "OK", severity: "Critical", lastChecked: now };
    } catch (e: any) {
      return { name: "Storage", status: "ERROR", severity: "Critical", lastChecked: now, message: e.message };
    }
  }

  static async testProviderConfig(provider: string): Promise<HealthComponent> {
    const now = Date.now();
    const isFal = provider === "fal";
    const key = isFal ? process.env.FAL_KEY : process.env.OPENROUTER_API_KEY;
    if (!key) {
      return { name: provider === "fal" ? "Fal.ai" : "OpenRouter", status: "ERROR", severity: "Warning", lastChecked: now, message: "Missing API Key" };
    }
    return { name: provider === "fal" ? "Fal.ai" : "OpenRouter", status: "OK", severity: "Warning", lastChecked: now, message: "Configured" };
  }

  static async testProviderPing(provider: string): Promise<HealthComponent> {
    const now = Date.now();
    const compName = provider === "fal" ? "Fal.ai" : "OpenRouter";
    const key = provider === "fal" ? process.env.FAL_KEY : process.env.OPENROUTER_API_KEY;
    if (!key) {
      return { name: compName, status: "ERROR", severity: "Warning", lastChecked: now, message: "Missing API Key" };
    }
    
    try {
      let res;
      if (provider === "fal") {
        // Simple ping to Fal API endpoint
        res = await fetch("https://queue.fal.run/fal-ai/flux-pro", { method: "OPTIONS" });
      } else {
        res = await fetch("https://openrouter.ai/api/v1/auth/key", { 
          headers: { "Authorization": `Bearer ${key}` }
        });
      }
      
      const latency = Date.now() - now;
      if (!res.ok) {
         return { name: compName, status: "ERROR", severity: "Warning", lastChecked: now, latencyMs: latency, message: `HTTP ${res.status}` };
      }
      return { name: compName, status: "OK", severity: "Warning", lastChecked: now, latencyMs: latency };
    } catch (e: any) {
      return { name: compName, status: "ERROR", severity: "Warning", lastChecked: now, message: e.message };
    }
  }
}
