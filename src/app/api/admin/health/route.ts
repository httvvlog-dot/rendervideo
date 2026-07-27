import { NextResponse } from "next/server";
import { HealthService } from "@/utils/diagnostics";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "true";
  const runAll = url.searchParams.get("runAll") === "true";

  // Check admin rights (optional, but good for security)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // In a real app, verify user.role === 'admin'
  // But for now we just require a user.

  try {
    let health;
    if (runAll) {
      health = await HealthService.runAllTests();
    } else {
      health = await HealthService.getHealth(force);
    }
    return NextResponse.json(health);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

