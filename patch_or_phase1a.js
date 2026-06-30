const fs = require('fs');
const path = require('path');

// 1. Patch actions.ts
const actionsPath = path.join(process.cwd(), 'src/app/admin/providers/actions.ts');
let actionsContent = fs.readFileSync(actionsPath, 'utf8');

const newAction = `
export async function testOpenRouterConnection(providerId: string | null, apiKeyInput: string | null) {
  await requireAdmin();
  const supabase = await createClient();
  
  let actualKey = apiKeyInput;
  if (!actualKey || actualKey === "••••••••••••••••") {
    if (!providerId) return { success: false, error: "No API Key provided" };
    const { data } = await supabase.from("providers").select("config_json").eq("id", providerId).single();
    if (!data || !data.config_json?.apiKey) return { success: false, error: "No API Key found in database" };
    actualKey = data.config_json.apiKey;
  }

  try {
    const startTime = Date.now();
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Authorization": \`Bearer \${actualKey}\`
      }
    });
    
    const latency = Date.now() - startTime;
    
    if (!res.ok) {
      return { success: false, error: \`API returned status \${res.status}\`, status: res.status };
    }
    
    const data = await res.json();
    return { 
      success: true, 
      latency, 
      status: res.status, 
      modelCount: data.data?.length || 0,
      models: data.data?.slice(0, 5).map((m: any) => m.id) || []
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
`;

if (!actionsContent.includes('testOpenRouterConnection')) {
  actionsContent += newAction;
  fs.writeFileSync(actionsPath, actionsContent, 'utf8');
  console.log('[OK] Added testOpenRouterConnection to actions.ts');
}

// 2. Patch provider-table.tsx
const tablePath = path.join(process.cwd(), 'src/app/admin/providers/components/provider-table.tsx');
let tableContent = fs.readFileSync(tablePath, 'utf8');

// Update imports
if (!tableContent.includes('testOpenRouterConnection')) {
  tableContent = tableContent.replace(
    'import { saveProvider, deleteProvider } from "../actions"',
    'import { saveProvider, deleteProvider, testOpenRouterConnection } from "../actions"'
  );
}

// Replace handleTestConnection
const oldHandleTest = /const handleTestConnection = async \([\s\S]*?\}\n/m;
const newHandleTest = `
  const handleTestConnection = async (provider: any) => {
    toast.loading("Pinging API...", { id: \`ping-\${provider.id}\` })
    
    if (provider.provider_name !== 'OpenRouter') {
      toast.error("Only OpenRouter test is implemented in Phase 1A", { id: \`ping-\${provider.id}\` });
      return;
    }

    try {
      // Use the masked key from client state, the server action will resolve it
      const res = await testOpenRouterConnection(provider.id, provider.config_json?.apiKey);
      
      if (res.success) {
        toast.success(
          <div className="flex flex-col gap-1">
            <div className="font-bold">Connected ({res.latency}ms)</div>
            <div className="text-xs text-slate-600">Status: {res.status}</div>
            <div className="text-xs text-slate-600">Models: {res.modelCount}</div>
          </div>,
          { id: \`ping-\${provider.id}\` }
        );
      } else {
        toast.error(\`Invalid API Key: \${res.error}\`, { id: \`ping-\${provider.id}\` });
      }
    } catch (err: any) {
      toast.error(\`Error: \${err.message}\`, { id: \`ping-\${provider.id}\` });
    }
  }
`;
tableContent = tableContent.replace(oldHandleTest, newHandleTest);

// Replace form
const oldForm = /<form id="provider-form" onSubmit=\{handleSubmit\} className="space-y-4">[\s\S]*?<\/form>/m;
const newForm = `
<form id="provider-form" onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Provider Name</label>
                    <input name="provider_name" required type="text" className="w-full border rounded-md px-3 py-2 text-sm bg-transparent" defaultValue={selectedProvider?.provider_name || ''} readOnly={!!selectedProvider} />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">API Key</label>
                    <input 
                      name="apiKey"
                      type="password" 
                      className="w-full border rounded-md px-3 py-2 text-sm bg-transparent" 
                      placeholder={selectedProvider?._hasSecret ? "•••••••••••••••• (Set)" : "Enter API Key"} 
                    />
                  </div>
                  
                  <div className="pt-4 space-y-4 border-t mt-6">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Enable Provider</label>
                      <input name="is_active" type="checkbox" defaultChecked={selectedProvider ? selectedProvider.is_active : true} className="h-4 w-4 rounded border-slate-300" />
                    </div>
                  </div>
                </form>
`;
tableContent = tableContent.replace(oldForm, newForm);

fs.writeFileSync(tablePath, tableContent, 'utf8');
console.log('[OK] Patched provider-table.tsx');
