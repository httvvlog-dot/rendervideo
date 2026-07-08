import { ProviderAdapter } from "../types"
import { uploadToS3 } from "@/utils/s3-signer"

export interface R2Args {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  projectId: string;
}

export interface R2Result {
  bucket: string;
  region: string;
  publicUrl: string;
  objectKey: string;
}

export class CloudflareR2Adapter implements ProviderAdapter<R2Args, R2Result> {
  async execute(credential: any, args: R2Args): Promise<R2Result> {
    const config = credential.config_json || {};
    
    if (!config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.bucket) {
      throw new Error("Incomplete R2 configuration in credential");
    }

    const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;
    const objectKey = `projects/${args.projectId}/media/${args.fileName}`;

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
      objectKey
    };
  }
}
