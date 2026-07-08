const fs = require('fs');
const path = require('path');

const pagePath = path.join(process.cwd(), 'src/app/(user)/projects/[id]/page.tsx');
if (fs.existsSync(pagePath)) {
  let content = fs.readFileSync(pagePath, 'utf8');
  
  if (!content.includes('ProjectMedia')) {
    // 1
    content = content.replace(
      'import { ScriptManager } from "./components/script-manager"',
      'import { ScriptManager } from "./components/script-manager"\nimport { ProjectMedia } from "./components/project-media"'
    );
    // 2
    content = content.replace(
      'export default async function ProjectDetailPage({ params }: { params: { id: string } }) {',
      'export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {\n  const { id } = await params;'
    );
    content = content.replace(/params\.id/g, 'id');
    // 3
    content = content.replace(
      ".order('version', { ascending: false })",
      ".order('version', { ascending: false })\n\n  const { data: projectMedia } = await supabase\n    .from('project_media')\n    .select('*')\n    .eq('project_id', id)\n    .order('created_at', { ascending: false })"
    );
    // 4
    content = content.replace(
      '            </div>\n          </div>\n        </div>',
      '            </div>\n          </div>\n          \n          <ProjectMedia projectId={id} initialMedia={projectMedia || []} />\n          \n        </div>'
    );
    fs.writeFileSync(pagePath, content, 'utf8');
    console.log('[OK] Patched project page.tsx');
  } else {
    console.log('[SKIP] page.tsx already has ProjectMedia');
  }
} else {
  console.log('[ERROR] page.tsx not found');
}
