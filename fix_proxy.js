const fs = require('fs');
const path = require('path');

const proxyPath = path.resolve(process.cwd(), 'src/proxy.ts');

try {
  let content = fs.readFileSync(proxyPath, 'utf8');
  
  // Replace 'export async function middleware' with 'export async function proxy'
  content = content.replace(/export async function middleware/g, 'export async function proxy');
  
  fs.writeFileSync(proxyPath, content, 'utf8');
  console.log('[OK] Patched src/proxy.ts successfully!');
} catch (err) {
  console.error('[ERROR] Failed to patch:', err.message);
}
