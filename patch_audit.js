const fs = require('fs');
const path = require('path');

// 1. Update audit.ts EntityType
const auditFile = path.join(process.cwd(), 'src/utils/audit.ts');
if (fs.existsSync(auditFile)) {
  let content = fs.readFileSync(auditFile, 'utf8');
  if (!content.includes('"ProviderCredential"')) {
    content = content.replace(
      'type EntityType = "Provider" | "Prompt" | "Voice" | "Render" | "Settings"',
      'type EntityType = "Provider" | "ProviderCredential" | "Prompt" | "Voice" | "Render" | "Settings"'
    );
    fs.writeFileSync(auditFile, content, 'utf8');
    console.log('[OK] Added ProviderCredential to EntityType in audit.ts');
  }
}

// 2. Delete temporary refactor directories that break Vercel Build
const dirsToRemove = ['refactor_temp', 'refactor_temp_v2', 'scripts_temp'];

dirsToRemove.forEach(dirName => {
  const dirPath = path.join(process.cwd(), dirName);
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`[OK] Deleted temporary directory: ${dirName}`);
    } catch (err) {
      console.error(`[ERROR] Failed to delete ${dirName}:`, err.message);
    }
  }
});
