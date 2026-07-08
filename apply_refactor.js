const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'refactor_temp');
const dstActions = path.join(process.cwd(), 'src/app/admin/providers/actions.ts');
const dstTabs = path.join(process.cwd(), 'src/app/admin/providers/components/providers-tabs.tsx');
const dstCards = path.join(process.cwd(), 'src/app/admin/providers/components/provider-cards.tsx');
const dstPage = path.join(process.cwd(), 'src/app/admin/providers/[id]/page.tsx');
const dstWorkspaceClient = path.join(process.cwd(), 'src/app/admin/providers/[id]/components/provider-workspace-client.tsx');
const dstOpenRouterForm = path.join(process.cwd(), 'src/app/admin/providers/[id]/components/forms/openrouter-form.tsx');
const dstElevenLabsForm = path.join(process.cwd(), 'src/app/admin/providers/[id]/components/forms/elevenlabs-form.tsx');
const dstCloudflareForm = path.join(process.cwd(), 'src/app/admin/providers/[id]/components/forms/cloudflare-r2-form.tsx');
const dstGenericForm = path.join(process.cwd(), 'src/app/admin/providers/[id]/components/forms/generic-form.tsx');

try {
  fs.copyFileSync(path.join(srcDir, 'actions.ts'), dstActions);
  fs.copyFileSync(path.join(srcDir, 'providers-tabs.tsx'), dstTabs);
  fs.copyFileSync(path.join(srcDir, 'provider-cards.tsx'), dstCards);
  fs.copyFileSync(path.join(srcDir, 'page.tsx'), dstPage);
  fs.copyFileSync(path.join(srcDir, 'provider-workspace-client.tsx'), dstWorkspaceClient);
  fs.copyFileSync(path.join(srcDir, 'openrouter-form.tsx'), dstOpenRouterForm);
  fs.copyFileSync(path.join(srcDir, 'elevenlabs-form.tsx'), dstElevenLabsForm);
  fs.copyFileSync(path.join(srcDir, 'cloudflare-r2-form.tsx'), dstCloudflareForm);
  fs.copyFileSync(path.join(srcDir, 'generic-form.tsx'), dstGenericForm);
  
  console.log('[OK] All refactored files have been copied successfully.');
} catch (e) {
  console.error('[ERROR]', e.message);
}
