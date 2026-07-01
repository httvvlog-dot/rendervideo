const fs = require('fs');
const path = require('path');

// 1. Update actions.ts
const actionsPath = path.join(process.cwd(), 'src/app/admin/providers/actions.ts');
let actionsContent = fs.readFileSync(actionsPath, 'utf8');

if (!actionsContent.includes('syncElevenLabsVoices')) {
  actionsContent += `
export async function syncElevenLabsVoices(providerId: string) {
  await requireAdmin();
  const supabase = await createClient();
  
  // Get API Key
  const { data: provider } = await supabase.from("providers").select("*").eq("id", providerId).single();
  if (!provider || !provider.config_json?.apiKey) return { success: false, error: "API Key not configured" };
  
  const apiKey = provider.config_json.apiKey;
  
  try {
    // Call ElevenLabs API
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey }
    });
    
    if (!res.ok) {
      await supabase.from("providers").update({ health_status: 'warning' }).eq("id", providerId);
      return { success: false, error: \`API Error: \${res.status}\` };
    }
    
    const data = await res.json();
    const voices = data.voices || [];
    
    if (voices.length === 0) {
      return { success: true, count: 0, message: "No voices found." };
    }

    // Upsert voices into voice_catalog
    const catalogEntries = voices.map((v: any) => ({
      provider: "ElevenLabs",
      voice_id: v.voice_id,
      name: v.name,
      category: v.category,
      labels: v.labels || {},
      preview_url: v.preview_url,
      updated_at: new Date().toISOString()
    }));

    const { error: upsertErr } = await supabase
      .from('voice_catalog')
      .upsert(catalogEntries, { onConflict: 'voice_id' });

    if (upsertErr) throw upsertErr;

    // Update health status
    await supabase.from("providers").update({ health_status: 'healthy' }).eq("id", providerId);
    
    revalidatePath("/admin/providers");
    return { success: true, count: voices.length, message: \`Successfully synced \${voices.length} voices.\` };

  } catch (err: any) {
    await supabase.from("providers").update({ health_status: 'offline' }).eq("id", providerId);
    revalidatePath("/admin/providers");
    return { success: false, error: err.message };
  }
}
`;
  fs.writeFileSync(actionsPath, actionsContent, 'utf8');
  console.log('[OK] Appended syncElevenLabsVoices to actions.ts');
}

// 2. Update provider-table.tsx
const tablePath = path.join(process.cwd(), 'src/app/admin/providers/components/provider-table.tsx');
let tableContent = fs.readFileSync(tablePath, 'utf8');

if (!tableContent.includes('syncElevenLabsVoices')) {
  // Add import
  tableContent = tableContent.replace(
    'import { saveProvider, deleteProvider, testOpenRouterConnection } from "../actions"',
    'import { saveProvider, deleteProvider, testOpenRouterConnection, syncElevenLabsVoices } from "../actions"'
  );
  
  // Add RefreshCw icon import if missing
  if (!tableContent.includes('RefreshCw')) {
    tableContent = tableContent.replace(
      'MoreHorizontal, Plus, Settings2, Trash2, Loader2, Activity',
      'MoreHorizontal, Plus, Settings2, Trash2, Loader2, Activity, RefreshCw'
    );
  }

  // Add Sync handler inside component
  const syncHandlerCode = `
  const handleSyncVoices = async (provider: any) => {
    const toastId = toast.loading("Syncing ElevenLabs catalog...", { id: \`sync-\${provider.id}\` })
    try {
      const result = await syncElevenLabsVoices(provider.id)
      if (result.success) {
        toast.success(result.message, { id: toastId })
      } else {
        toast.error(result.error, { id: toastId })
      }
    } catch (err: any) {
      toast.error("Failed to sync", { id: toastId })
    }
  }

  const handleTestConnection = async`;
  
  tableContent = tableContent.replace('const handleTestConnection = async', syncHandlerCode);

  // Add the Sync Button in the JSX mapped row
  const oldButtons = `<div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleTestConnection(p)} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors" title="Test Connection">
                        <Activity className="h-4 w-4" />
                      </button>`;
  const newButtons = `<div className="flex items-center justify-end gap-2">
                      {p.provider_name === 'ElevenLabs' && (
                        <button onClick={() => handleSyncVoices(p)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors" title="Sync Voice Catalog">
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => handleTestConnection(p)} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors" title="Test Connection">
                        <Activity className="h-4 w-4" />
                      </button>`;
                      
  tableContent = tableContent.replace(oldButtons, newButtons);
  
  fs.writeFileSync(tablePath, tableContent, 'utf8');
  console.log('[OK] Updated provider-table.tsx with Sync Voices button');
}

