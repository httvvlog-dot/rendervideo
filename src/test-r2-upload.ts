import { ProviderRuntime, CloudflareR2Adapter } from "@/utils/provider-runtime";
import { createAdminClient } from "@/utils/supabase/admin";

async function runTest() {
  console.log("Fetching R2 Credentials from remote DB...");
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('providers').select('id').eq('provider_key', 'cloudflare_r2').single();
  if (error || !data) {
    console.error("Provider not found");
    return;
  }
  
  const { data: creds } = await supabase.from('provider_credentials').select('*').eq('provider_id', data.id).eq('is_active', true);
  console.log("Active Credentials Selected:", creds?.length || 0, "found");
  if (creds && creds.length > 0) {
    const config = creds[0].config_json;
    console.log("Required Fields Present:");
    console.log(" - accountId:", !!config.accountId);
    console.log(" - accessKeyId:", !!config.accessKeyId);
    console.log(" - secretAccessKey:", !!config.secretAccessKey);
    console.log(" - bucket:", !!config.bucket);
  }

  const runtime = new ProviderRuntime("cloudflare_r2", {
    retryCount: 0, // Fail fast
  });

  const buffer = Buffer.from("test ascii data");
  
  try {
    console.log("\nAttempting ASCII-only upload...");
    const uploadResult = await runtime.execute(new CloudflareR2Adapter(), {
      step: "UPLOAD",
      projectId: "test-project-123",
      args: {
        action: "UPLOAD",
        fileBuffer: buffer,
        fileName: "test-ascii.png",
        mimeType: "image/png",
        projectId: "test-project-123"
      }
    });
    console.log("Upload Success:", uploadResult);
  } catch (err: any) {
    console.error("Upload Failed:");
    console.dir(err, { depth: null });
    console.error("Message:", err.message);
  }
}

runTest();
