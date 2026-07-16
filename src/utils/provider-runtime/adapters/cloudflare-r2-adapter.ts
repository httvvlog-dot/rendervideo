import { ProviderAdapter } from "../types"
import { uploadToS3, deleteFromS3 } from "@/utils/s3-signer"

export interface R2Args {
  action?: "UPLOAD" | "DELETE";
  fileBuffer?: Buffer;
  fileName?: string;
  mimeType?: string;
  projectId?: string;
  objectKey?: string;
}

export interface R2Result {
  bucket?: string;
  region?: string;
  publicUrl?: string;
  objectKey?: string;
  success?: boolean;
}

export class CloudflareR2Adapter implements ProviderAdapter<R2Args, R2Result> {
  async execute(credential: any, args: R2Args): Promise<R2Result> {
    const config = credential.config_json || {};
    
    if (!config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.bucket) {
      throw new Error("Incomplete R2 configuration in credential");
    }

    const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;
    const action = args.action || "UPLOAD";

    if (action === "DELETE") {
      if (!args.objectKey) throw new Error("objectKey required for DELETE");
      const res = await deleteFromS3({
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        endpoint
      }, config.bucket, args.objectKey);
      
      if (!res.success) {
        throw new Error(`R2 Delete failed: ${res.error}`);
      }
      return { success: true };
    }

    // UPLOAD
    if (!args.fileName || !args.projectId || !args.fileBuffer || !args.mimeType) {
      throw new Error("Missing arguments for UPLOAD");
    }

    const objectKey = args.objectKey || `projects/${args.projectId}/media/${args.fileName}`;

    const uploadRes = await uploadToS3(
      {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        endpoint
      },
      config.bucket,
      objectKey,
      args.fileBuffer,
      args.mimeType
    );

    if (!uploadRes.success) {
      throw new Error(`R2 Upload failed: ${uploadRes.error}`);
    }

    return {
      bucket: config.bucket,
      region: "auto",
      publicUrl: config.publicUrl ? `${config.publicUrl}/${objectKey}` : "",
      objectKey,
      success: true
    };
  }

  async generateSignedUrl(credential: any, objectKey: string, forceDownload: boolean = false): Promise<string> {
    const config = credential.config_json || {};
    if (!config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.bucket) {
      throw new Error("Incomplete R2 configuration in credential");
    }

    const { generateSignedUrl } = await import("@/utils/s3-signer");
    const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;
    
    return await generateSignedUrl(
      {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        endpoint
      },
      config.bucket,
      objectKey,
      3600, // 1 hour expiration
      forceDownload
    );
  }
}
