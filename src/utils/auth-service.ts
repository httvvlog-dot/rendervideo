import { createClient } from "./supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "admin" | "user";
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch role and profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, avatar_url")
    .eq("id", user.id)
    .single();


  console.log("PROFILE RESULT", profile)
  console.log("ROLE RESULT", profile?.role)


  console.log("PROFILE RESULT", profile)
  console.log("ROLE RESULT", profile?.role)

  return {
    id: user.id,
    email: user.email || "",
    full_name: profile?.full_name || null,
    avatar_url: profile?.avatar_url || null,
    role: profile?.role || "user",
  };
}
