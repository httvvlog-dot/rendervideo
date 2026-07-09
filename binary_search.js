const fs = require('fs');
const path = require('path');

const level = process.argv[2];

if (!level) {
  console.log("Vui long cung cap level (1, 2, 3, hoac 4)");
  console.log("Vi du: node binary_search.js 1");
  process.exit(1);
}

let content = '';

if (level === '1') {
  content = `
export const dynamic = "force-dynamic"

export default async function ProvidersPage() {
  return <div className="p-10 text-2xl font-bold">TEST LEVEL 1 - NO DATA FETCHING, NO COMPONENTS</div>
}
`;
} else if (level === '2') {
  content = `
import { getProviders } from "./actions"

export const dynamic = "force-dynamic"

export default async function ProvidersPage() {
  const providers = await getProviders()
  return (
    <div className="p-10 text-2xl font-bold">
      TEST LEVEL 2 - DATA FETCHING ONLY
    </div>
  )
}
`;
} else if (level === '3') {
  content = `
import { ProvidersTabs } from "./components/providers-tabs"

export const dynamic = "force-dynamic"

export default async function ProvidersPage() {
  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">TEST LEVEL 3 - RENDER COMPONENTS (NO DATA)</h1>
      <ProvidersTabs initialData={[]} />
    </div>
  )
}
`;
} else if (level === '4') {
  content = `
import { getProviders } from "./actions"
import { ProvidersTabs } from "./components/providers-tabs"
import { LogOut } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ProvidersPage() {
  const providers = await getProviders()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">TEST LEVEL 4 - FULL INTEGRATION</h1>
      </div>
      <ProvidersTabs initialData={providers} />
    </div>
  )
}
`;
} else if (level === '5') {
  content = `
import { getProviders } from "./actions"
import { ProvidersTabs } from "./components/providers-tabs"
import { LogOut } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ProvidersPage() {
  const providers = await getProviders()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 relative">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">AI Providers</h1>
          <form action="/api/logout" method="GET">
            <button
              type="submit"
              className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </form>
        </div>
        <p className="text-muted-foreground text-slate-500">
          Manage integrations with LLMs, Voice Generation, Storage, and Subtitles. API Keys are securely masked.
        </p>
      </div>

      <ProvidersTabs initialData={providers} />
    </div>
  )
}
`;
} else {
  console.log("Level khong hop le. Chi chap nhan 1, 2, 3, 4, 5.");
  process.exit(1);
}

const fullPath = path.join(__dirname, 'src/app/admin/providers/page.tsx');
try {
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log("[OK] Da ghi de page.tsx thanh TEST LEVEL " + level);
} catch (e) {
  console.error("[ERROR] Khong the ghi file:", e.message);
}
