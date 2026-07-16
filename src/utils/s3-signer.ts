import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string; // e.g., https://<account_id>.r2.cloudflarestorage.com
  region?: string;
}

function createS3Client(config: S3Config): S3Client {
  return new S3Client({
    region: config.region || "auto",
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export async function uploadToS3(
  config: S3Config,
  bucket: string,
  key: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const s3 = createS3Client(config);
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });
    
    await s3.send(command);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteFromS3(
  config: S3Config,
  bucket: string,
  key: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const s3 = createS3Client(config);
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await s3.send(command);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function generateSignedUrl(
  config: S3Config,
  bucket: string,
  key: string,
  expiresInSeconds: number = 3600,
  forceDownload: boolean = false,
  downloadFilename: string = "video.mp4"
): Promise<string> {
  const s3 = createS3Client(config);
  
  const commandInput: any = {
    Bucket: bucket,
    Key: key,
  };

  if (forceDownload) {
    commandInput.ResponseContentDisposition = `attachment; filename="${downloadFilename}"`;
  }

  const command = new GetObjectCommand(commandInput);
  
  return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}
