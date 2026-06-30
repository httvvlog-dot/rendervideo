const fs = require('fs');
const path = require('path');

const filePath = path.resolve(process.cwd(), 'src/utils/auth-service.ts');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const debugCode = `
  console.log("======== AUTH DEBUG ========");
  console.log("USER ID:", user.id);
  console.log("EMAIL:", user.email);
  console.log("PROFILE ROLE:", profile?.role);
  console.log("PROFILE DATA:", profile);
  console.log("============================");
`;

  // Insert the debug code right before the return statement
  content = content.replace('  return {', debugCode + '\n  return {');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[OK] Patched src/utils/auth-service.ts with debug logs successfully!');
} catch (err) {
  console.error('[ERROR] Failed to patch:', err.message);
}
