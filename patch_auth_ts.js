const fs = require('fs');
const path = require('path');

const filePath = path.resolve(process.cwd(), 'src/utils/auth-service.ts');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the typescript error causing line
  content = content.replace(
    'avatar_url: profile?.avatar_url || null,',
    'avatar_url: user.user_metadata?.avatar_url || null,'
  );
  
  // Clean up duplicate console.logs
  content = content.replace(
    `  console.log("PROFILE RESULT", profile)\n  console.log("ROLE RESULT", profile?.role)\n\n\n  console.log("PROFILE RESULT", profile)\n  console.log("ROLE RESULT", profile?.role)`,
    `  console.log("PROFILE RESULT", profile)\n  console.log("ROLE RESULT", profile?.role)`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[OK] Patched src/utils/auth-service.ts to fix TypeScript error successfully!');
} catch (err) {
  console.error('[ERROR] Failed to patch:', err.message);
}
