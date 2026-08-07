const fs = require('fs');
const path = require('path');

const filesToPatch = [
  {
    path: 'src/app/login/actions.ts',
    content: `"use server"\n\nimport { revalidatePath } from "next/cache"\nimport { redirect } from "next/navigation"\nimport { createClient } from "@/utils/supabase/server"\nimport { getCurrentUser } from "@/utils/auth-service"\n\nexport async function login(formData: FormData) {\n  const supabase = await createClient()\n  const data = {\n    email: formData.get("email") as string,\n    password: formData.get("password") as string,\n  }\n  const { error } = await supabase.auth.signInWithPassword(data)\n  if (error) {\n    return { error: "Could not authenticate user" }\n  }\n  const user = await getCurrentUser()\n  if (user?.role === "admin") {\n    revalidatePath("/admin/dashboard")\n    redirect("/admin/dashboard")\n  }\n  revalidatePath("/dashboard")\n  redirect("/dashboard")\n}\n\nexport async function signup(formData: FormData) {\n  const supabase = await createClient()\n  const data = {\n    email: formData.get("email") as string,\n    password: formData.get("password") as string,\n  }\n  const { error } = await supabase.auth.signUp(data)\n  if (error) {\n    return { error: "Could not authenticate user" }\n  }\n  revalidatePath("/dashboard")\n  redirect("/dashboard")\n}`
  }
];

let successCount = 0;

for (const file of filesToPatch) {
  const absolutePath = path.resolve(process.cwd(), file.path);
  try {
    fs.writeFileSync(absolutePath, file.content, 'utf8');
    console.log(`[OK] Patched ${file.path}`);
    successCount++;
  } catch (err) {
    console.error(`[ERROR] Failed to patch ${file.path}: ${err.message}`);
  }
}

if (successCount === filesToPatch.length) {
  console.log("\\n🎉 Build error fixed! You can now run 'npm run build'.");
} else {
  console.log("\\n⚠️ Some files failed. Run this in an elevated Administrator terminal.");
}
