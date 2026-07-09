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
} else {
  console.log("Level khong hop le. Chi chap nhan 1, 2, 3, 4.");
  process.exit(1);
}

const fullPath = path.join(__dirname, 'src/app/admin/providers/page.tsx');
try {
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log("[OK] Da ghi de page.tsx thanh TEST LEVEL " + level);
} catch (e) {
  console.error("[ERROR] Khong the ghi file:", e.message);
}
