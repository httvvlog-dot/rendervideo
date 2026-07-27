import { NextResponse } from "next/server";
import { HealthService } from "@/utils/diagnostics";

export async function GET() {
  try {
    const health = await HealthService.getHealth();
    return NextResponse.json({ 
      status: health.status,
      schemaStatus: health.components.schema?.status || "UNKNOWN",
      dbStatus: health.components.database?.status || "UNKNOWN"
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

