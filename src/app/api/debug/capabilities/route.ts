import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { count } = await supabase
    .from("ai_capabilities")
    .select("*", { count: "exact", head: true });

  const { data } = await supabase
    .from("ai_capabilities")
    .select("*");

  return NextResponse.json({
    count,
    data
  });
}
