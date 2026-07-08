const fs = require('fs');
const path = require('path');

const actionsPath = path.join(process.cwd(), 'src/app/admin/providers/actions.ts');
if (fs.existsSync(actionsPath)) {
  let content = fs.readFileSync(actionsPath, 'utf8');
  
  if (!content.includes('export async function createProvider')) {
    content += "\nexport async function createProvider(type: string, name: string) {\n" +
               "  await requireAdmin();\n" +
               "  const supabase = createAdminClient();\n" +
               "  const { data, error } = await supabase.from('providers').insert({ \n" +
               "    provider_type: type, \n" +
               "    provider_name: name,\n" +
               "    is_active: true,\n" +
               "    health_status: 'unknown'\n" +
               "  }).select('id').single();\n" +
               "  if (error) return { error: error.message };\n" +
               "  return { id: data.id };\n" +
               "}\n";
    fs.writeFileSync(actionsPath, content, 'utf8');
    console.log('[OK] Patched actions.ts with createProvider');
  } else {
    console.log('actions.ts already contains createProvider');
  }
}
