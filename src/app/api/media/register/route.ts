import { NextRequest, NextResponse } from "next/server";
import { MediaService } from "@/utils/media/MediaService";

// Security: Verify worker secret
const WORKER_SECRET = process.env.WORKER_SECRET || "dev-worker-secret-123";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${WORKER_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized worker access" }, { status: 401 });
    }

    const body = await req.json();
    console.log("[Media Register API] Request Body:", body);
    
    const { objectKey, publicUrl, mimeType, size, contentHash, userId, generationType } = body;
    console.log("[Media Register API] Target UserId:", userId);

    if (!objectKey || !publicUrl || !mimeType || !size || !contentHash || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const regInput = {
      objectKey,
      publicUrl,
      mimeType,
      size,
      contentHash,
      userId,
      generationType: generationType || 'RENDER'
    };
    console.log("[Media Register API] MediaService.register() Input:", regInput);

    // Call Idempotent Register
    const asset = await MediaService.register(
      regInput.objectKey,
      regInput.publicUrl,
      regInput.mimeType,
      regInput.size,
      regInput.contentHash,
      regInput.userId,
      regInput.generationType
    );

    return NextResponse.json({
      success: true,
      asset
    });

  } catch (error: any) {
    console.error("API /media/register Error:", error);
    console.error("Stack Trace:", error.stack);
    return NextResponse.json({ 
      error: error.message,
      details: error.toString(),
      code: error.code || "UNKNOWN_ERROR"
    }, { status: 500 });
  }
}
