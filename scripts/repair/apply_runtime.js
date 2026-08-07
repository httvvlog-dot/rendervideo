const fs = require('fs');
const path = require('path');

// 1. Copy script-actions.ts
const scriptSrc = path.join(process.cwd(), 'refactor_temp_v3', 'script-actions.ts');
const scriptDst = path.join(process.cwd(), 'src', 'app', '(user)', 'projects', '[id]', 'script-actions.ts');

if (fs.existsSync(scriptSrc)) {
  fs.copyFileSync(scriptSrc, scriptDst);
  console.log('[OK] Copied script-actions.ts');
}

// 2. Patch actions.ts with the new testCredentialConnection
const actionsFile = path.join(process.cwd(), 'src', 'app', 'admin', 'providers', 'actions.ts');
const testCredFile = path.join(process.cwd(), 'refactor_temp_v3', 'test_credential.ts');

if (fs.existsSync(actionsFile) && fs.existsSync(testCredFile)) {
  let actionsContent = fs.readFileSync(actionsFile, 'utf8');
  const testCredContent = fs.readFileSync(testCredFile, 'utf8');
  
  // Extract imports from test_credential
  const imports = `import { HealthTracker } from "@/utils/provider-runtime/health-tracker"\nimport { TelemetryRecorder } from "@/utils/provider-runtime/telemetry-recorder"\nimport { RuntimeLogger } from "@/utils/provider-runtime/runtime-logger"`;
  
  if (!actionsContent.includes('HealthTracker')) {
    actionsContent = actionsContent.replace('"use server"', `"use server"\n\n${imports}`);
  }

  // Extract the function body from test_credential
  const funcRegex = /export async function testCredentialConnection\([\s\S]*?^}/m;
  const newFuncMatch = testCredContent.match(funcRegex);
  
  if (newFuncMatch) {
    actionsContent = actionsContent.replace(funcRegex, newFuncMatch[0]);
    fs.writeFileSync(actionsFile, actionsContent, 'utf8');
    console.log('[OK] Patched testCredentialConnection in actions.ts');
  }
}
