const fs = require('fs');
const path = require('path');

const filePath = path.resolve(process.cwd(), 'src/utils/auth-service.ts');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove the old debug block
  content = content.replace(/[\s]*console\.log\("======== AUTH DEBUG ========"\);[\s\S]*?console\.log\("============================"\);/, '');

  // Add the exact lines requested by the user
  const newDebug = `
  console.log("PROFILE RESULT", profile)
  console.log("ROLE RESULT", profile?.role)
`;

  content = content.replace('  return {', newDebug + '\n  return {');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[OK] Patched src/utils/auth-service.ts with exact requested logs successfully!');
} catch (err) {
  console.error('[ERROR] Failed to patch:', err.message);
}
