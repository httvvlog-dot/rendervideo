const fs = require('fs');
const path = require('path');

const actionsPath = path.join(process.cwd(), 'src/app/admin/providers/actions.ts');
let content = fs.readFileSync(actionsPath, 'utf8');

if (!content.includes('testOpenRouterConnection')) {
  const newAction = `
export async function testOpenRouterConnection(apiKey: string) {
  await requireAdmin();
  
  if (!apiKey || apiKey === "••••••••••••••••") {
    return { success: false, error: "Invalid API Key. Please enter the real key." };
  }

  try {
    const startTime = Date.now();
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Authorization": \`Bearer \${apiKey}\`
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
  
  content += newAction;
  fs.writeFileSync(actionsPath, content, 'utf8');
  console.log('[OK] Added testOpenRouterConnection to actions.ts');
} else {
  console.log('[INFO] testOpenRouterConnection already exists');
}
