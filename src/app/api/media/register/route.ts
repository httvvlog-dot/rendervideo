import { NextRequest, NextResponse } from "next/server";
import { MediaService } from "@/utils/media/MediaService";
import { ProjectService } from "@/utils/projects/ProjectService";
import { verifyWorkerToken } from "@/utils/worker-auth";

export async function POST(req: NextRequest) {
  console.log("===== REQUEST ARRIVED =====");
  try {
    const authHeader = req.headers.get("authorization");
    if (!verifyWorkerToken(authHeader)) {
      return NextResponse.json({ error: "Unauthorized worker access" }, { status: 401 });
    }

    const correlationId = req.headers.get("X-Correlation-ID");
    console.log("Correlation:", correlationId);

    const body = await req.json();
    console.log("===== RAW BODY =====");
    console.dir(body, { depth: null });
    console.log("[Media Register API] Request Body:", body);
    
    const { objectKey, publicUrl, mimeType, size, contentHash, projectId, generationType } = body;
    console.log("[Media Register API] Target ProjectId:", projectId);

    if (!objectKey || !publicUrl || !mimeType || !size || !contentHash || !projectId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Resolve owning userId from the project
    const ownerUserId = await ProjectService.resolveOwner(projectId);

    if (!ownerUserId) {
      return NextResponse.json({ error: "Project not found or could not resolve owner" }, { status: 404 });
    }

    console.log("===== RESOLUTION LOG =====");
    console.log({
      projectId,
      ownerUserId,
      objectKey,
      contentHash
    });

    const regInput = {
      objectKey,
      publicUrl,
      mimeType,
      size,
      contentHash,
      userId: ownerUserId,
      generationType: generationType || 'RENDER'
    };
    console.log("Validated Payload:", regInput);

    console.log("===== BEFORE REGISTER =====");
    console.dir(regInput, { depth: null });

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

    console.log("===== AFTER REGISTER =====");
    console.dir(asset, { depth: null });

    return NextResponse.json({
      success: true,
      asset
    });

  } catch (error: any) {
    console.error("=== MEDIA REGISTER ERROR ===");
    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    console.error("Error cause:", error?.cause);
    if (error?.code) console.error("Error code:", error.code);
    if (error?.details) console.error("Error details:", error.details);
    if (error?.hint) console.error("Error hint:", error.hint);
    console.error(error);
    console.error(error?.stack);
    
    // Read correlationId again since it might fail before it was extracted if req parsing fails
    const correlationId = req.headers.get("X-Correlation-ID");
    
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
      correlationId: correlationId || ""
    }, { status: 500 });
  }
}
