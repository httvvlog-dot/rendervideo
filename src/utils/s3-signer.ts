import * as crypto from "crypto";

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string; // e.g., https://<account_id>.r2.cloudflarestorage.com
  region?: string;
}

function sha256(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function hmac(key: crypto.BinaryLike | crypto.KeyObject, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
  const kDate = hmac("AWS4" + key, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, "aws4_request");
  return kSigning;
}

export async function uploadToS3(
  config: S3Config,
  bucket: string,
  key: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const method = "PUT";
    const service = "s3";
    const region = config.region || "auto";
    const host = new URL(config.endpoint).host;
    
    // Cloudflare R2 expects /bucket/key format or subdomain format. 
    // Usually endpoint is https://<account>.r2.cloudflarestorage.com
    // So path is /<bucket>/<key>
    const canonicalUri = `/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
    
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.substring(0, 8); // YYYYMMDD

    const payloadHash = sha256(buffer);

    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

    const canonicalRequest = [
      method,
      canonicalUri,
      "", // canonical query string
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join("\n");

    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      sha256(canonicalRequest)
    ].join("\n");

    const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, region, service);
    const signature = hmac(signingKey, stringToSign).toString("hex");

    const authorizationHeader = `${algorithm} Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const url = `${config.endpoint}${canonicalUri}`;

    const response = await fetch(url, {
      method,
      headers: {
        "Authorization": authorizationHeader,
        "x-amz-date": amzDate,
        "x-amz-content-sha256": payloadHash,
        "Content-Type": mimeType,
        "Content-Length": buffer.length.toString()
      },
      body: buffer as unknown as BodyInit
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `Upload failed: ${response.status} ${text}` };
    }

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
    const method = "DELETE";
    const service = "s3";
    const region = config.region || "auto";
    const host = new URL(config.endpoint).host;
    
    const canonicalUri = `/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
    
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.substring(0, 8);

    const payloadHash = sha256("");

    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

    const canonicalRequest = [
      method,
      canonicalUri,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join("\n");

    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      sha256(canonicalRequest)
    ].join("\n");

    const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, region, service);
    const signature = hmac(signingKey, stringToSign).toString("hex");

    const authorizationHeader = `${algorithm} Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const url = `${config.endpoint}${canonicalUri}`;

    const response = await fetch(url, {
      method,
      headers: {
        "Authorization": authorizationHeader,
        "x-amz-date": amzDate,
        "x-amz-content-sha256": payloadHash
      }
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `Delete failed: ${response.status} ${text}` };
    }

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
  const method = "GET";
  const service = "s3";
  const region = config.region || "auto";
  const host = new URL(config.endpoint).host;
  
  const canonicalUri = `/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.substring(0, 8);
  
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  
  const searchParams = new URLSearchParams();
  searchParams.set("X-Amz-Algorithm", algorithm);
  searchParams.set("X-Amz-Credential", `${config.accessKeyId}/${credentialScope}`);
  searchParams.set("X-Amz-Date", amzDate);
  searchParams.set("X-Amz-Expires", expiresInSeconds.toString());
  searchParams.set("X-Amz-SignedHeaders", "host");
  
  if (forceDownload) {
    searchParams.set("response-content-disposition", `attachment; filename="${downloadFilename}"`);
  }
  
  // AWS requires strict RFC 3986 encoding: spaces must be %20, and !'()* must be encoded.
  const awsURIEncode = (str: string) => {
    return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
      return '%' + c.charCodeAt(0).toString(16).toUpperCase();
    });
  };
  
  // URL parameters must be sorted for signing
  const sortedParams = Array.from(searchParams.entries()).sort(([a], [b]) => a.localeCompare(b));
  const canonicalQueryString = sortedParams.map(([k, v]) => `${awsURIEncode(k)}=${awsURIEncode(v)}`).join("&");
  
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = "host";
  const payloadHash = "UNSIGNED-PAYLOAD";
  
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");
  
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256(canonicalRequest)
  ].join("\n");
  
  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, region, service);
  const signature = hmac(signingKey, stringToSign).toString("hex");
  
  return `${config.endpoint}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}
