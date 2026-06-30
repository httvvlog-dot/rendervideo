const fs = require('fs');
const path = require('path');

const layoutPath = path.resolve(process.cwd(), 'src/app/admin/layout.tsx');

try {
  let content = fs.readFileSync(layoutPath, 'utf8');
  
  const debugCode = `
  console.log("=== ADMIN DEBUG ===");
  console.log("auth user id:", user?.id);
  console.log("profile:", user);
  console.log("profile.role:", user?.role);
  console.log("role check result:", user?.role === "admin");
`;

  // Insert debugCode right after `const user = await getCurrentUser()`
  content = content.replace(
    'const user = await getCurrentUser()',
    'const user = await getCurrentUser()\n' + debugCode
  );
  
  fs.writeFileSync(layoutPath, content, 'utf8');
  console.log('[OK] Patched src/app/admin/layout.tsx with exactly requested logs successfully!');
} catch (err) {
  console.error('[ERROR] Failed to patch:', err.message);
}
