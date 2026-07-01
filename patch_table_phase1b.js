const fs = require('fs');
const path = require('path');

const tablePath = path.join(process.cwd(), 'src/app/admin/providers/components/provider-table.tsx');
let tableContent = fs.readFileSync(tablePath, 'utf8');

// Update imports
if (!tableContent.includes('testElevenLabsConnection')) {
  tableContent = tableContent.replace(
    'import { saveProvider, deleteProvider, testOpenRouterConnection } from "../actions"',
    'import { saveProvider, deleteProvider, testOpenRouterConnection, testElevenLabsConnection, testR2Connection } from "../actions"'
  );
}

// Modify handleTestConnection to route properly
const handleTestMatcher = /const handleTestConnection = async \([\s\S]*?\} catch \(err: any\) \{[\s\S]*?\}\n  \}/m;
const newHandleTest = `
  const handleTestConnection = async (provider: any) => {
    toast.loading("Pinging API...", { id: \`ping-\${provider.id}\` })
    
    try {
      let res;
      if (provider.provider_name === 'OpenRouter') {
        res = await testOpenRouterConnection(provider.id, provider.config_json?.apiKey);
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
      } else if (provider.provider_name === 'ElevenLabs') {
        res = await testElevenLabsConnection(provider.id, provider.config_json?.apiKey);
        if (res.success) {
          toast.success(
            <div className="flex flex-col gap-1">
              <div className="font-bold">Connected ({res.latency}ms)</div>
              <div className="text-xs text-slate-600">Status: {res.status}</div>
              <div className="text-xs text-slate-600">Voices: {res.voiceCount}</div>
            </div>,
            { id: \`ping-\${provider.id}\` }
          );
        } else {
          toast.error(\`Invalid API Key: \${res.error}\`, { id: \`ping-\${provider.id}\` });
        }
      } else if (provider.provider_name === 'Cloudflare R2') {
        res = await testR2Connection(provider.id, provider.config_json);
        if (res.success) {
          toast.success(
            <div className="flex flex-col gap-1">
              <div className="font-bold">Connected ({res.latency}ms)</div>
              <div className="text-xs text-slate-600">Bucket \${res.bucket} verified</div>
            </div>,
            { id: \`ping-\${provider.id}\` }
          );
        } else {
          toast.error(\`Invalid Credentials: \${res.error}\`, { id: \`ping-\${provider.id}\` });
        }
      } else {
        toast.error("Test connection not implemented for this provider yet.", { id: \`ping-\${provider.id}\` });
      }
      
    } catch (err: any) {
      toast.error(\`Error: \${err.message}\`, { id: \`ping-\${provider.id}\` });
    }
  }
`;
if (!tableContent.includes('provider.provider_name === \'ElevenLabs\'')) {
  tableContent = tableContent.replace(handleTestMatcher, newHandleTest);
}

// Implement minimal forms for ElevenLabs and R2
const formMatcher = /<form id="provider-form" onSubmit=\{handleSubmit\} className="space-y-4">[\s\S]*?<\/form>/m;
const newForms = `
<form id="provider-form" onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Provider Name</label>
                    <input name="provider_name" required type="text" className="w-full border rounded-md px-3 py-2 text-sm bg-transparent" defaultValue={selectedProvider?.provider_name || ''} readOnly={!!selectedProvider} />
                  </div>
                  
                  {type !== 'storage' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">API Key</label>
                      <input 
                        name="apiKey"
                        type="password" 
                        className="w-full border rounded-md px-3 py-2 text-sm bg-transparent" 
                        placeholder={selectedProvider?._hasSecret ? "•••••••••••••••• (Set)" : "Enter API Key"} 
                      />
                    </div>
                  )}

                  {type === 'storage' && (
                     <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Account ID</label>
                        <input name="accountId" type="text" required className="w-full border rounded-md px-3 py-2 text-sm bg-transparent" defaultValue={selectedProvider?.config_json?.accountId || ''} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Access Key ID</label>
                        <input name="accessKeyId" type="password" required className="w-full border rounded-md px-3 py-2 text-sm bg-transparent" placeholder={selectedProvider?.config_json?.accessKeyId === "••••••••••••••••" ? "•••••••••••••••• (Set)" : ""} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Secret Access Key</label>
                        <input name="secretAccessKey" type="password" required className="w-full border rounded-md px-3 py-2 text-sm bg-transparent" placeholder={selectedProvider?._hasSecret ? "•••••••••••••••• (Set)" : ""} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Bucket Name</label>
                        <input name="bucket" type="text" required className="w-full border rounded-md px-3 py-2 text-sm bg-transparent" defaultValue={selectedProvider?.config_json?.bucket || ''} />
                      </div>
                     </>
                  )}
                  
                  <div className="pt-4 space-y-4 border-t mt-6">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Enable Provider</label>
                      <input name="is_active" type="checkbox" defaultChecked={selectedProvider ? selectedProvider.is_active : true} className="h-4 w-4 rounded border-slate-300" />
                    </div>
                  </div>
                </form>
`;
tableContent = tableContent.replace(formMatcher, newForms);

// Fix Health Badge UI in the Table
const healthCellMatcher = /<td className="px-4 py-3 capitalize">[\s\S]*?<\/td>/m;
const newHealthCell = `
                  <td className="px-4 py-3 capitalize">
                    <span className="flex items-center gap-1.5">
                      {p.health_status === 'healthy' && <span className="flex items-center text-green-600 dark:text-green-400 font-medium"><span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>Connected</span>}
                      {p.health_status === 'warning' && <span className="flex items-center text-yellow-600 dark:text-yellow-400 font-medium"><span className="h-2 w-2 rounded-full bg-yellow-500 mr-2"></span>Slow</span>}
                      {p.health_status === 'offline' && <span className="flex items-center text-red-600 dark:text-red-400 font-medium"><span className="h-2 w-2 rounded-full bg-red-500 mr-2"></span>Invalid API Key</span>}
                      {(!p.health_status || p.health_status === 'unknown') && <span className="flex items-center text-slate-500 font-medium"><span className="h-2 w-2 rounded-full border border-slate-400 mr-2"></span>Unknown</span>}
                    </span>
                  </td>
`;
if (tableContent.includes('p.health_status === \'healthy\' ? \'bg-green-500\'')) {
  tableContent = tableContent.replace(healthCellMatcher, newHealthCell);
}

fs.writeFileSync(tablePath, tableContent, 'utf8');
console.log('[OK] Updated provider-table.tsx');
