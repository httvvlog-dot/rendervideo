const fs = require('fs');
const path = require('path');

const actionsFile = path.join(process.cwd(), 'src/app/admin/providers/actions.ts');

if (fs.existsSync(actionsFile)) {
  let content = fs.readFileSync(actionsFile, 'utf8');

  // Replace error throws with safe fallbacks
  content = content.replace(
    /if \(provError\) throw new Error\(provError\.message\)/g,
    'if (provError) { console.error("Provider Error:", provError); return []; }'
  );

  content = content.replace(
    /if \(credError\) throw new Error\(credError\.message\)/g,
    'if (credError) { console.error("Credential Error:", credError); credentials = []; }'
  );

  // We need to change 'const { data: credentials' to 'let { data: credentials'
  content = content.replace(
    /const \{ data: credentials/g,
    'let { data: credentials'
  );
  
  // Safeguard array operations
  content = content.replace(
    /const mappedProviders = providers\.map/g,
    'const mappedProviders = (providers || []).map'
  );

  content = content.replace(
    /const pCreds = credentials/g,
    'const pCreds = (credentials || [])'
  );

  fs.writeFileSync(actionsFile, content, 'utf8');
  console.log('[OK] Patched actions.ts to prevent Vercel 500 crashes');
} else {
  console.log('[ERROR] actions.ts not found');
}
