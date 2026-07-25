import { BillingEngine, BillingFeature } from "@/utils/billing";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await BillingEngine.resolveCapability(
      BillingFeature.SCRIPT_GENERATION,
      "openrouter",
      "openai/gpt-4o-mini"
    );
    return NextResponse.json({
      success: true,
      capability: result
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
