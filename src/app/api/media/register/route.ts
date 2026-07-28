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
    const { objectKey, publicUrl, mimeType, size, contentHash, userId, generationType } = body;

    if (!objectKey || !publicUrl || !mimeType || !size || !contentHash || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Call Idempotent Register
    const asset = await MediaService.register(
      objectKey,
      publicUrl,
      mimeType,
      size,
      contentHash,
      userId,
      generationType || 'RENDER'
    );

    return NextResponse.json({
      success: true,
      asset
    });

  } catch (error: any) {
    console.error("API /media/register Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
