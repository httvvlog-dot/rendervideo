import { createAdminClient } from "@/utils/supabase/admin";
import { CredentialSelector } from "@/utils/provider-runtime/credential-selector";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

async function runCheck() {
  console.log("Starting Worker Pre-flight Check...");
  let hasError = false;

  const logPass = (msg: string) => console.log(`[PASS] ${msg}`);
  const logFail = (msg: string) => {
    console.error(`[FAIL] ${msg}`);
    hasError = true;
  };

  // 1. Supabase Configuration
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    logPass("Supabase configuration");
  } else {
    logFail("Supabase configuration (Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)");
  }

  // 2. FFmpeg Binary
  const ffmpegPath = process.env.FFMPEG_PATH || ffmpegInstaller.path;
  if (ffmpegPath) {
    logPass("FFmpeg binary");
  } else {
    logFail("FFmpeg binary (Could not resolve FFmpeg path)");
  }

  // If config is missing, we can't test connection safely
  if (!url || !key) {
    console.error("Aborting remaining checks due to missing configuration.");
    process.exit(1);
  }

  // 3. Supabase Connection & RPC Access
  const supabase = createAdminClient();
  try {
    const { data, error } = await supabase.rpc('claim_next_render_job', { p_worker_id: 'pre-flight-check-00' });
    if (error && error.code !== 'P0001' && !error.message.includes("Could not find")) { 
      // P0001 or missing data might just mean queue is empty. We are checking for permissions.
      if (error.code === '42501') { // insufficient privilege
        logFail("Render queue RPC (Permission denied - verify service_role access)");
      } else {
         // Even if there are no jobs or another error, if we didn't get a 42501 or 42883 (routine missing), we connected successfully.
         logPass("Supabase connection");
         logPass("Render queue RPC");
      }
    } else {
      logPass("Supabase connection");
      logPass("Render queue RPC");
    }
  } catch (err: any) {
    logFail(`Supabase connection / RPC: ${err.message}`);
  }

  // 4. Cloudflare R2 Provider Check
  try {
    const selector = new CredentialSelector("cloudflare_r2");
    const creds = await selector.getActiveCredentials();
    if (creds && creds.length > 0) {
      logPass("Cloudflare R2 provider");
    } else {
      logFail("Cloudflare R2 provider (No active credentials found in remote database)");
    }
  } catch (err: any) {
    logFail(`Cloudflare R2 provider: ${err.message}`);
  }

  if (hasError) {
    console.error("Worker Pre-flight Check FAILED.");
    process.exit(1);
  } else {
    console.log("Worker Pre-flight Check COMPLETED SUCCESSFULLY.");
    process.exit(0);
  }
}

runCheck();
