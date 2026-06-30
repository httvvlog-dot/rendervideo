const fs = require('fs');
const path = require('path');

const layoutPath = path.resolve(process.cwd(), 'src/app/(user)/layout.tsx');

try {
  let content = fs.readFileSync(layoutPath, 'utf8');
  
  content = content.replace(
    '<div className="flex flex-1 flex-col overflow-hidden">',
    '<div className="flex flex-1 flex-col overflow-hidden lg:pl-64">'
  );
  
  fs.writeFileSync(layoutPath, content, 'utf8');
  console.log('[OK] Patched src/app/(user)/layout.tsx successfully!');
} catch (err) {
  console.error('[ERROR] Failed to patch:', err.message);
}
