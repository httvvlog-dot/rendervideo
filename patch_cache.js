const fs = require('fs');
const path = require('path');

const filePath = path.resolve(process.cwd(), 'src/utils/supabase/server.ts');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('global: {')) {
    content = content.replace(
      'cookies: {',
      `global: {
        fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
      },
      cookies: {`
    );
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('[OK] Patched src/utils/supabase/server.ts to disable Data Cache successfully!');
  } else {
    console.log('[INFO] Already patched.');
  }
} catch (err) {
  console.error('[ERROR] Failed to patch:', err.message);
}
