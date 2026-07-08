const fs = require('fs');
const path = require('path');

const pagePath = path.join(process.cwd(), 'src/app/admin/providers/[id]/page.tsx');
if (fs.existsSync(pagePath)) {
  let content = fs.readFileSync(pagePath, 'utf8');
  
  if (content.includes('params: { id: string }')) {
    content = content.replace(
      'export default async function ProviderWorkspacePage({ params }: { params: { id: string } }) {',
      'export default async function ProviderWorkspacePage({ params }: { params: Promise<{ id: string }> }) {\n  const { id } = await params;'
    );
    content = content.replace('eq("id", params.id)', 'eq("id", id)');
    fs.writeFileSync(pagePath, content, 'utf8');
    console.log('[OK] Patched [id]/page.tsx for Next.js 16 params Promise');
  } else {
    console.log('[SKIP] [id]/page.tsx is already patched or format changed');
  }
} else {
  console.log('[ERROR] [id]/page.tsx not found');
}
