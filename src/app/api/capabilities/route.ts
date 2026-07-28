import { NextResponse } from "next/server";
import { CapabilityService } from "@/utils/capability";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const capabilities = await CapabilityService.getCapabilities();
    return NextResponse.json(capabilities);
  } catch (error: any) {
    console.error("Capabilities API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
