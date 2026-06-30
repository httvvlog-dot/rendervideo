const fs = require('fs');
const path = require('path');

const filePath = path.resolve(process.cwd(), 'src/utils/auth-service.ts');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the profile fetching logic to use admin client to bypass RLS and add no-store
  const newProfileFetch = `
  // Use admin client to bypass RLS and fetch latest role
  const { createClient: createAdminClient } = require('@supabase/supabase-js');
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  console.log("======== AUTH DEBUG v2 ========");
  console.log("USER ID:", user.id);
  console.log("FETCHED ROLE:", profile?.role);
  console.log("===============================");
`;

  content = content.replace(/const { data: profile } = await supabase[\s\S]*?\.single\(\);/, newProfileFetch);
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[OK] Patched src/utils/auth-service.ts with service role fetch successfully!');
} catch (err) {
  console.error('[ERROR] Failed to patch:', err.message);
}
