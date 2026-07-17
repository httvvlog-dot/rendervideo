import { createClient } from "@/utils/supabase/server";
import { VoicesClient } from "./components/voices-client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ElevenLabsVoicesPage() {
  const supabase = await createClient();
  const { data: userResponse } = await supabase.auth.getUser();
  
  if (!userResponse?.user) {
    redirect("/admin/login");
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userResponse.user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect("/");
  }

  const { data: voices, error } = await supabase
    .from("voice_presets")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch voice presets", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 relative">
        <div className="flex items-center gap-4">
          <Link href="/admin/providers" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">ElevenLabs Voices</h1>
        </div>
        <p className="text-muted-foreground text-slate-500 ml-12">
          Manage, sync, and import AI voices from ElevenLabs.
        </p>
      </div>

      <VoicesClient initialVoices={voices || []} />
    </div>
  );
}
