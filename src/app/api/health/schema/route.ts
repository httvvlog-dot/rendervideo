import { NextResponse } from "next/server";
import { HealthService } from "@/utils/diagnostics";

export async function GET() {
  try {
    const health = await HealthService.getHealth();
    
    // Convert to pure Monitoring JSON
    const responseData = { 
      status: health.infrastructure.schema === "OK" && health.infrastructure.database === "OK" ? "OK" : "ERROR",
      schemaStatus: health.infrastructure.schema,
      dbStatus: health.infrastructure.database,
      fullHealth: health // Added for debugging
    };
    
    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Health Check Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
