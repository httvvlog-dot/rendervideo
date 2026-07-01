const fs = require('fs');
const path = require('path');

const actionsPath = path.join(process.cwd(), 'src/app/admin/providers/actions.ts');
let actionsContent = fs.readFileSync(actionsPath, 'utf8');

// Update testOpenRouterConnection to save health_status
const updateHealthHelper = `
async function updateProviderHealth(providerId: string, latency: number, isSuccess: boolean) {
  if (!providerId) return;
  const supabase = await createClient();
  let health_status = isSuccess ? (latency > 1500 ? 'warning' : 'healthy') : 'offline';
  await supabase.from("providers").update({
    health_status,
    last_checked_at: new Date().toISOString()
  }).eq("id", providerId);
}
`;

if (!actionsContent.includes('updateProviderHealth')) {
  // Insert helper
  actionsContent += updateHealthHelper;
}

// Modify testOpenRouterConnection to update health
if (!actionsContent.includes('updateProviderHealth(providerId, latency, true)')) {
  actionsContent = actionsContent.replace(
    'return { \n      success: true, \n      latency, \n      status: res.status, \n      modelCount: data.data?.length || 0,\n      models: data.data?.slice(0, 5).map((m: any) => m.id) || []\n    };',
    `await updateProviderHealth(providerId, latency, true);
    return { 
      success: true, 
      latency, 
      status: res.status, 
      modelCount: data.data?.length || 0,
      models: data.data?.slice(0, 5).map((m: any) => m.id) || []
    };`
  );
  actionsContent = actionsContent.replace(
    'return { success: false, error: err.message };',
    `await updateProviderHealth(providerId, 0, false);
    return { success: false, error: err.message };`
  );
  actionsContent = actionsContent.replace(
    'return { success: false, error: `API returned status ${res.status}`, status: res.status };',
    `await updateProviderHealth(providerId, latency, false);
    return { success: false, error: \`API returned status \${res.status}\`, status: res.status };`
  );
}

// Add testElevenLabsConnection
const testElevenLabs = `
export async function testElevenLabsConnection(providerId: string | null, apiKeyInput: string | null) {
  await requireAdmin();
  const supabase = await createClient();
  
  let actualKey = apiKeyInput;
  if (!actualKey || actualKey === "••••••••••••••••") {
    if (!providerId) return { success: false, error: "No API Key provided" };
    const { data } = await supabase.from("providers").select("config_json").eq("id", providerId).single();
    if (!data || !data.config_json?.apiKey) return { success: false, error: "No API Key found in database" };
    actualKey = data.config_json.apiKey;
  }

  try {
    const startTime = Date.now();
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": actualKey
      }
    });
    
    const latency = Date.now() - startTime;
    
    if (!res.ok) {
      if (providerId) await updateProviderHealth(providerId, latency, false);
      return { success: false, error: \`API returned status \${res.status}\`, status: res.status };
    }
    
    const data = await res.json();
    if (providerId) await updateProviderHealth(providerId, latency, true);
    return { 
      success: true, 
      latency, 
      status: res.status, 
      voiceCount: data.voices?.length || 0
    };
  } catch (err: any) {
    if (providerId) await updateProviderHealth(providerId, 0, false);
    return { success: false, error: err.message };
  }
}
`;

if (!actionsContent.includes('testElevenLabsConnection')) {
  actionsContent += testElevenLabs;
}

// Add testR2Connection
const testR2 = `
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";

export async function testR2Connection(providerId: string | null, configInput: any) {
  await requireAdmin();
  const supabase = await createClient();
  
  let accountId = configInput?.accountId;
  let accessKeyId = configInput?.accessKeyId;
  let secretAccessKey = configInput?.secretAccessKey;
  let bucket = configInput?.bucket;

  if (providerId) {
    const { data } = await supabase.from("providers").select("config_json").eq("id", providerId).single();
    if (data && data.config_json) {
      accountId = accountId || data.config_json.accountId;
      accessKeyId = accessKeyId === "••••••••••••••••" || !accessKeyId ? data.config_json.accessKeyId : accessKeyId;
      secretAccessKey = secretAccessKey === "••••••••••••••••" || !secretAccessKey ? data.config_json.secretAccessKey : secretAccessKey;
      bucket = bucket || data.config_json.bucket;
    }
  }

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return { success: false, error: "Missing required R2 credentials" };
  }

  try {
    const startTime = Date.now();
    const S3 = new S3Client({
      region: "auto",
      endpoint: \`https://\${accountId}.r2.cloudflarestorage.com\`,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
    
    await S3.send(new HeadBucketCommand({ Bucket: bucket }));
    const latency = Date.now() - startTime;
    
    if (providerId) await updateProviderHealth(providerId, latency, true);
    return { 
      success: true, 
      latency, 
      bucket
    };
  } catch (err: any) {
    if (providerId) await updateProviderHealth(providerId, 0, false);
    return { success: false, error: err.message };
  }
}
`;

if (!actionsContent.includes('testR2Connection')) {
  // Prepend import to top
  actionsContent = 'import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";\n' + actionsContent;
  actionsContent += testR2.replace('import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";\n', '');
}

// Ensure mask logic supports R2 keys
if (!actionsContent.includes('safeConfig.secretAccessKey = "••••••••••••••••"')) {
  actionsContent = actionsContent.replace(
    /if \(safeConfig\.secretKey\) \{[\s\S]*?\}/,
    `if (safeConfig.secretKey) {
      hasApiKey = true
      safeConfig.secretKey = "••••••••••••••••"
    }
    if (safeConfig.accessKeyId) {
      safeConfig.accessKeyId = "••••••••••••••••"
    }
    if (safeConfig.secretAccessKey) {
      hasApiKey = true
      safeConfig.secretAccessKey = "••••••••••••••••"
    }`
  );
}

if (!actionsContent.includes('newConfig.secretAccessKey = existingConfig.secretAccessKey')) {
  actionsContent = actionsContent.replace(
    /if \(newConfig\.secretKey === "••••••••••••••••" \|\| newConfig\.secretKey === ""\) \{[\s\S]*?\}/,
    `if (newConfig.secretKey === "••••••••••••••••" || newConfig.secretKey === "") {
    newConfig.secretKey = existingConfig.secretKey
  }
  if (newConfig.accessKeyId === "••••••••••••••••" || newConfig.accessKeyId === "") {
    newConfig.accessKeyId = existingConfig.accessKeyId
  }
  if (newConfig.secretAccessKey === "••••••••••••••••" || newConfig.secretAccessKey === "") {
    newConfig.secretAccessKey = existingConfig.secretAccessKey
  }`
  );
}

fs.writeFileSync(actionsPath, actionsContent, 'utf8');
console.log('[OK] Updated actions.ts');
