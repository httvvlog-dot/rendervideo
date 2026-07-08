const fs = require('fs');
const path = require('path');

console.log("Starting patch process...");

// 1. Create admin.ts
const adminTsPath = path.join(process.cwd(), 'src/utils/supabase/admin.ts');
const adminTsContent = "import { createClient } from '@supabase/supabase-js'\n\nexport function createAdminClient() {\n  return createClient(\n    process.env.NEXT_PUBLIC_SUPABASE_URL || '',\n    process.env.SUPABASE_SERVICE_ROLE_KEY || '',\n    { auth: { autoRefreshToken: false, persistSession: false } }\n  )\n}\n";
fs.writeFileSync(adminTsPath, adminTsContent, 'utf8');
console.log('[OK] Created admin.ts');

// 2. Patch actions.ts
const actionsPath = path.join(process.cwd(), 'src/app/admin/providers/actions.ts');
if (fs.existsSync(actionsPath)) {
  let content = fs.readFileSync(actionsPath, 'utf8');
  if (!content.includes('createAdminClient')) {
    content = content.replace('import { createClient } from "@/utils/supabase/server"', 'import { createClient } from "@/utils/supabase/server"\nimport { createAdminClient } from "@/utils/supabase/admin"');
  }
  content = content.split('await createClient()').join('createAdminClient()');
  
  if (!content.includes('syncElevenLabsVoices')) {
    content += "\nexport async function syncElevenLabsVoices(providerId: string) {\n" +
               "  const supabase = createAdminClient();\n" +
               "  const { data: provider } = await supabase.from('providers').select('*').eq('id', providerId).single();\n" +
               "  if (!provider || !provider.config_json?.apiKey) return { success: false, error: 'API Key missing' };\n" +
               "  try {\n" +
               "    const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': provider.config_json.apiKey } });\n" +
               "    if (!res.ok) { await supabase.from('providers').update({ health_status: 'warning' }).eq('id', providerId); return { success: false, error: 'API Error' }; }\n" +
               "    const data = await res.json();\n" +
               "    const voices = data.voices || [];\n" +
               "    if (voices.length === 0) return { success: true, count: 0, message: 'No voices' };\n" +
               "    const catalogEntries = voices.map((v: any) => ({ provider: 'ElevenLabs', voice_id: v.voice_id, name: v.name, preview_url: v.preview_url }));\n" +
               "    await supabase.from('voice_catalog').upsert(catalogEntries, { onConflict: 'voice_id' });\n" +
               "    await supabase.from('providers').update({ health_status: 'healthy' }).eq('id', providerId);\n" +
               "    return { success: true, count: voices.length, message: 'Synced ' + voices.length + ' voices.' };\n" +
               "  } catch (err: any) {\n" +
               "    await supabase.from('providers').update({ health_status: 'offline' }).eq('id', providerId);\n" +
               "    return { success: false, error: err.message };\n" +
               "  }\n" +
               "}\n";
  }
  fs.writeFileSync(actionsPath, content, 'utf8');
  console.log('[OK] Patched actions.ts');
}

// 3. Patch provider-table.tsx
const tablePath = path.join(process.cwd(), 'src/app/admin/providers/components/provider-table.tsx');
if (fs.existsSync(tablePath)) {
  let tableContent = fs.readFileSync(tablePath, 'utf8');
  
  if (!tableContent.includes('syncElevenLabsVoices')) {
    tableContent = tableContent.replace(
      'import { saveProvider, deleteProvider, testOpenRouterConnection } from "../actions"',
      'import { saveProvider, deleteProvider, testOpenRouterConnection, syncElevenLabsVoices } from "../actions"'
    );
  }

  const syncHandlerCode = "  const handleSyncVoices = async (provider: any) => {\n" +
                          "    const toastId = toast.loading('Syncing...');\n" +
                          "    try {\n" +
                          "      const result = await syncElevenLabsVoices(provider.id);\n" +
                          "      if (result.success) toast.success(result.message, { id: toastId });\n" +
                          "      else toast.error(result.error, { id: toastId });\n" +
                          "    } catch (err: any) { toast.error('Failed to sync', { id: toastId }); }\n" +
                          "  }\n\n  const handleTestConnection = async";
  
  if (!tableContent.includes('handleSyncVoices')) {
    tableContent = tableContent.replace('const handleTestConnection = async', syncHandlerCode);
  }

  const oldButtons = '<div className="flex items-center justify-end gap-2">\n                      <button onClick={() => handleTestConnection(p)} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors" title="Test Connection">\n                        <Activity className="h-4 w-4" />\n                      </button>';
  const newButtons = '<div className="flex items-center justify-end gap-2">\n                      {p.provider_name === "ElevenLabs" && (\n                        <button onClick={() => handleSyncVoices(p)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors" title="Sync Voice Catalog">\n                          <Activity className="h-4 w-4" />\n                        </button>\n                      )}\n                      <button onClick={() => handleTestConnection(p)} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors" title="Test Connection">\n                        <Activity className="h-4 w-4" />\n                      </button>';
  
  if (tableContent.includes(oldButtons)) {
    tableContent = tableContent.replace(oldButtons, newButtons);
  }
  
  const oldSave = /await saveProvider\\(payload\\)[\\s\\S]*?closeSheet\\(\\)/;
  if (oldSave.test(tableContent)) {
    tableContent = tableContent.replace(oldSave, 'const res = await saveProvider(payload)\n      if (res && res.error) { toast.error("Error: " + res.error) } else { toast.success("Saved!"); closeSheet() }');
  }

  fs.writeFileSync(tablePath, tableContent, 'utf8');
  console.log('[OK] Patched provider-table.tsx');
}
console.log("Done.");
