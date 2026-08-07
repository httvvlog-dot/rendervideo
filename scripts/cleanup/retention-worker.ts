import { config } from "dotenv";
config({ path: ".env.local" });
import { createAdminClient } from "../../src/utils/supabase/admin";
import { CleanupService } from "../../src/utils/cleanup/CleanupService";
import { RETENTION_CONFIG } from "../../src/config/system";

async function run() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  
  console.log(`[RetentionWorker] Started. Dry Run: ${isDryRun}`);
  
  const adminClient = createAdminClient();
  
  // 1. Try to acquire advisory lock
  const lockKey = 1000123; // Unique ID for retention worker
  const { data: lockData, error: lockErr } = await adminClient.rpc("pg_try_advisory_lock", { key: lockKey }).single();
  
  if (lockErr) {
    // If rpc doesn't exist or fails, we will just proceed with a warning or fallback.
    // Assuming pg_try_advisory_lock might not be exposed as RPC natively, we might need a raw query.
    // Since we can't guarantee the RPC exists, we will catch and log.
    console.warn(`[RetentionWorker] Advisory lock RPC failed or not found: ${lockErr.message}`);
  } else if (!lockData) {
    console.log(`[RetentionWorker] Could not acquire lock. Another worker is running.`);
    return;
  }
  
  try {
    const expirationThreshold = new Date(Date.now() - RETENTION_CONFIG.RETENTION_HOURS * 60 * 60 * 1000).toISOString();
    
    // 2. Query expired projects
    const { data: projects, error: dbErr } = await adminClient
      .from("projects")
      .select("id")
      .lte("created_at", expirationThreshold)
      .in("status", ["completed", "failed", "cancelled", "draft"])
      .limit(RETENTION_CONFIG.BATCH_SIZE);
      
    if (dbErr) {
      throw new Error(`Failed to query projects: ${dbErr.message}`);
    }
    
    if (!projects || projects.length === 0) {
      console.log(`[RetentionWorker] No expired projects found.`);
      return;
    }
    
    console.log(`[RetentionWorker] Found ${projects.length} expiring projects.`);
    
    for (const project of projects) {
      const startTime = performance.now();
      
      console.log(`[RetentionWorker] Processing Project ${project.id}...`);
      
      const result = await CleanupService.deleteProject(project.id, isDryRun);
      const duration = ((performance.now() - startTime) / 1000).toFixed(2);
      
      if (result.success) {
        if (isDryRun) {
           console.log(`  -> [DRY RUN] Would delete ${result.assetsFound} assets (${result.filesDeleted} files, ${result.filesSkippedShared} shared skipped).`);
        } else {
           console.log(`  -> Completed in ${duration}s. Deleted ${result.assetsFound} assets (${result.filesDeleted} files, ${result.filesSkippedShared} shared skipped). Project DB row deleted.`);
        }
      } else {
        console.error(`  -> Failed: ${result.error}. Retry Next Run.`);
      }
      
      // Sleep between processing
      await new Promise(r => setTimeout(r, RETENTION_CONFIG.SLEEP_MS));
    }
    
  } finally {
    // Release lock
    if (!lockErr && lockData) {
      await adminClient.rpc("pg_advisory_unlock", { key: lockKey });
    }
    console.log(`[RetentionWorker] Finished.`);
  }
}

run().catch(console.error);
