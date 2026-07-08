const fs = require('fs');
const path = require('path');

const forms = ['openrouter-form.tsx', 'elevenlabs-form.tsx', 'cloudflare-r2-form.tsx', 'generic-form.tsx'];
const formsDir = path.join(process.cwd(), 'src/app/admin/providers/[id]/components/forms');

for (const form of forms) {
  const filePath = path.join(formsDir, form);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/from "\.\.\/actions"/g, 'from "../../../actions"');
    content = content.replace(/from "\.\.\/\.\.\/actions"/g, 'from "../../../actions"'); // Just in case
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('[OK] Patched', form);
  }
}

const clientFile = path.join(process.cwd(), 'src/app/admin/providers/[id]/components/provider-workspace-client.tsx');
if (fs.existsSync(clientFile)) {
  let content = fs.readFileSync(clientFile, 'utf8');
  content = content.replace(/from "\.\.\/\.\.\/\.\.\/components\/diagnostics-panel"/g, 'from "../../components/diagnostics-panel"');
  fs.writeFileSync(clientFile, content, 'utf8');
  console.log('[OK] Patched provider-workspace-client.tsx');
}
