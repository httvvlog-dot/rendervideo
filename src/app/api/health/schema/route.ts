import { NextResponse } from "next/server";
import { HealthService } from "@/utils/diagnostics";

export async function GET() {
  try {
    const health = await HealthService.getHealth();
    
    const responseData = { 
      status: health.status,
      schemaStatus: health.components.schema?.status || "UNKNOWN",
      dbStatus: health.components.database?.status || "UNKNOWN",
      fullHealth: health // Added for debugging
    };
    
    console.log("Health Check Response:", JSON.stringify(responseData, null, 2));
    
    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Health Check Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

