const fs = require('fs');
const path = require('path');

const filePath = path.resolve(process.cwd(), 'src/utils/auth-service.ts');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the faulty select statement
  content = content.replace(
    '.select("role, full_name, avatar_url")',
    '.select("role, full_name")'
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[OK] Patched src/utils/auth-service.ts to remove avatar_url from query successfully!');
} catch (err) {
  console.error('[ERROR] Failed to patch:', err.message);
}
