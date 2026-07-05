const fs = require('fs');
const path = require('path');

// 1. Create admin.ts
const adminTsPath = path.join(process.cwd(), 'src/utils/supabase/admin.ts');
const adminTsContent = `
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase env vars for admin client')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
`;
fs.writeFileSync(adminTsPath, adminTsContent, 'utf8');
console.log('[OK] Created src/utils/supabase/admin.ts');

// 2. Patch actions.ts
const actionsPath = path.join(process.cwd(), 'src/app/admin/providers/actions.ts');
if (fs.existsSync(actionsPath)) {
  let content = fs.readFileSync(actionsPath, 'utf8');

  if (!content.includes('createAdminClient')) {
    content = content.replace(
      'import { createClient } from "@/utils/supabase/server"',
      'import { createClient } from "@/utils/supabase/server"\nimport { createAdminClient } from "@/utils/supabase/admin"'
    );
  }

  content = content.replace(/const supabase = await createClient\\(\\)/g, 'const supabase = createAdminClient()');
  
  fs.writeFileSync(actionsPath, content, 'utf8');
  console.log('[OK] Patched actions.ts to use Admin Client (bypassing RLS)');
}

// 3. Patch provider-table.tsx to show errors properly
const tablePath = path.join(process.cwd(), 'src/app/admin/providers/components/provider-table.tsx');
if (fs.existsSync(tablePath)) {
  let tableContent = fs.readFileSync(tablePath, 'utf8');
  
  const pattern = /await saveProvider\\(payload\\)[\\s\\S]*?closeSheet\\(\\)/;
  
  const replacement = `const res = await saveProvider(payload)
      if (res && res.error) {
        toast.error("Error: " + res.error)
      } else {
        toast.success("Saved successfully!")
        closeSheet()
      }`;
      
  if (pattern.test(tableContent)) {
    tableContent = tableContent.replace(pattern, replacement);
    fs.writeFileSync(tablePath, tableContent, 'utf8');
    console.log('[OK] Patched provider-table.tsx error handling');
  } else {
    console.log('[WARN] provider-table.tsx pattern not found.');
  }
}
