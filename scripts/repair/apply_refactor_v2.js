const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'refactor_temp_v2');

const mappings = {
  'actions.ts': 'src/app/admin/providers/actions.ts',
  'provider-cards.tsx': 'src/app/admin/providers/components/provider-cards.tsx',
  'page.tsx': 'src/app/admin/providers/[id]/page.tsx',
  'provider-workspace-client.tsx': 'src/app/admin/providers/[id]/components/provider-workspace-client.tsx',
  'credential-card.tsx': 'src/app/admin/providers/[id]/components/credential-card.tsx',
  'openrouter-form.tsx': 'src/app/admin/providers/[id]/components/forms/openrouter-form.tsx',
  'elevenlabs-form.tsx': 'src/app/admin/providers/[id]/components/forms/elevenlabs-form.tsx',
  'cloudflare-r2-form.tsx': 'src/app/admin/providers/[id]/components/forms/cloudflare-r2-form.tsx',
  'generic-form.tsx': 'src/app/admin/providers/[id]/components/forms/generic-form.tsx'
};

try {
  for (const [srcFile, dstFile] of Object.entries(mappings)) {
    const srcPath = path.join(srcDir, srcFile);
    const dstPath = path.join(process.cwd(), dstFile);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, dstPath);
      console.log('[OK] Copied', srcFile);
    } else {
      console.log('[WARNING] Missing source file', srcFile);
    }
  }
  console.log('[SUCCESS] All Phase 3.3 refactored files have been copied.');
} catch (e) {
  console.error('[ERROR]', e.message);
}
