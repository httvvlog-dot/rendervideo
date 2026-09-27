import { createAdminClient } from "@/utils/supabase/admin";
import { ProviderRuntime } from "@/utils/provider-runtime";
import { CloudflareR2Adapter } from "@/utils/provider-runtime/adapters/cloudflare-r2-adapter";

export type AssetStatus = 'CREATED' | 'REGISTERED' | 'ATTACHED' | 'ORPHANED' | 'ARCHIVED' | 'DELETED';

export interface AssetMetadata {
    id: string;
    bucket: string;
    path: string;
    public_url: string;
    mime_type: string;
    size: number;
    content_hash: string | null;
    status: AssetStatus;
}

export class MediaService {
    /**
     * Deduplicates and Uploads an asset to R2, then registers it in storage_files.
     */
    static async upload(
        fileBuffer: Buffer, 
        fileName: string, 
        mimeType: string, 
        contentHash: string,
        userId: string,
        projectId: string,
        generationType: string = 'UPLOAD'
    ): Promise<AssetMetadata> {
        const adminClient = createAdminClient();

        // 1. Deduplication Lookup
        const { data: existingAsset } = await adminClient
            .from("storage_files")
            .select("*")
            .eq("content_hash", contentHash)
            .neq("status", "DELETED")
            .limit(1)
            .single();

        if (existingAsset) {
            console.log(`[MediaService] Deduplicated asset by hash: ${contentHash}`);
            return {
                id: existingAsset.id,
                bucket: existingAsset.bucket,
                path: existingAsset.path,
                public_url: existingAsset.public_url,
                mime_type: existingAsset.mime_type,
                size: existingAsset.size,
                content_hash: existingAsset.content_hash,
                status: existingAsset.status as AssetStatus
            };
        }

        // 2. Upload to Cloudflare R2
        const runtime = new ProviderRuntime("cloudflare_r2", {
            retryCount: 2,
            retryDelay: 500,
            failureThreshold: 3
        });

        const finalFileName = `${Date.now()}_${Math.random().toString(36).substring(2,9)}_${fileName}`;

        const uploadResult = await runtime.execute(new CloudflareR2Adapter(), {
            step: "UPLOAD",
            projectId: projectId,
            args: {
                action: "UPLOAD",
                fileBuffer,
                fileName: finalFileName,
                mimeType,
                projectId
            }
        });

        // 3. Insert into storage_files
        const { data: newAsset, error: insertError } = await adminClient
            .from("storage_files")
            .insert({
                provider: "cloudflare_r2",
                bucket: uploadResult.result.bucket,
                path: uploadResult.result.objectKey,
                mime_type: mimeType,
                size: fileBuffer.byteLength,
                public_url: uploadResult.result.publicUrl,
                content_hash: contentHash,
                generation_type: generationType,
                status: 'CREATED',
                cached_reference_count: 0
            })
            .select()
            .single();

        if (insertError) {
            // Attempt to rollback R2 upload
            try {
                await runtime.execute(new CloudflareR2Adapter(), {
                    step: "UPLOAD", projectId, args: { action: "DELETE", objectKey: uploadResult.result.objectKey }
                });
            } catch (e) {
                console.error("Failed to rollback R2 upload:", e);
            }
            throw new Error(`Failed to create storage_files record: ${insertError.message}`);
        }

        return {
            id: newAsset.id,
            bucket: newAsset.bucket,
            path: newAsset.path,
            public_url: newAsset.public_url,
            mime_type: newAsset.mime_type,
            size: newAsset.size,
            content_hash: newAsset.content_hash,
            status: newAsset.status as AssetStatus
        };
    }

    /**
     * Idempotent registration of an externally uploaded asset (e.g. from Render Worker)
     */
    static async register(
        objectKey: string,
        publicUrl: string,
        mimeType: string,
        size: number,
        contentHash: string,
        userId: string,
        generationType: string = 'RENDER'
    ): Promise<AssetMetadata> {
        const adminClient = createAdminClient();

        // Idempotency check
        const { data: existingAsset } = await adminClient
            .from("storage_files")
            .select("*")
            .eq("content_hash", contentHash)
            .limit(1)
            .single();

        if (existingAsset) {
            return {
                id: existingAsset.id,
                bucket: existingAsset.bucket,
                path: existingAsset.path,
                public_url: existingAsset.public_url,
                mime_type: existingAsset.mime_type,
                size: existingAsset.size,
                content_hash: existingAsset.content_hash,
                status: existingAsset.status as AssetStatus
            };
        }

        const { data: newAsset, error } = await adminClient
            .from("storage_files")
            .insert({
                provider: "cloudflare_r2",
                bucket: "taovideo", // Default bucket
                path: objectKey,
                mime_type: mimeType,
                size,
                public_url: publicUrl,
                content_hash: contentHash,
                generation_type: generationType,
                status: 'REGISTERED',
                cached_reference_count: 0
            })
            .select()
            .single();

        if (error) throw new Error(`Registration failed: ${error.message}`);

        return {
            id: newAsset.id,
            bucket: newAsset.bucket,
            path: newAsset.path,
            public_url: newAsset.public_url,
            mime_type: newAsset.mime_type,
            size: newAsset.size,
            content_hash: newAsset.content_hash,
            status: newAsset.status as AssetStatus
        };
    }

    /**
     * Deletes an asset from R2 and marks it DELETED in the database.
     * Prevents deletion of ATTACHED assets to protect data integrity.
     */
    static async delete(assetId: string): Promise<boolean> {
        const adminClient = createAdminClient();

        // 1. Verify Ownership / Status
        const { data: asset, error: fetchErr } = await adminClient
            .from("storage_files")
            .select("id, status, path, bucket, provider")
            .eq("id", assetId)
            .single();

        if (fetchErr || !asset) {
            console.warn(`[MediaService] Cannot delete asset ${assetId}: Not found`);
            return false;
        }

        if (asset.status === 'ATTACHED') {
            throw new Error(`[MediaService] Cannot delete ATTACHED asset ${assetId}. Detach it first.`);
        }

        if (asset.status === 'DELETED') {
            return true; // Already deleted
        }

        // 2. Delete from R2
        try {
            if (asset.provider === 'cloudflare_r2') {
                const runtime = new ProviderRuntime("cloudflare_r2");
                await runtime.execute(new CloudflareR2Adapter(), {
                    step: "UPLOAD", projectId: 'system', args: { action: "DELETE", objectKey: asset.path }
                });
            }
        } catch (e: any) {
            console.error(`[MediaService] R2 Delete failed for ${asset.path}:`, e.message);
            // We continue to mark it deleted in DB? No, if R2 fails, we should retry later.
            throw new Error(`R2 Deletion failed: ${e.message}`);
        }

        // 3. Update DB
        await adminClient.from("storage_files").update({ 
            status: 'DELETED',
            orphaned_at: null // Clear orphaned timestamp
        }).eq("id", assetId);

        console.log(`[MediaService] Successfully deleted asset ${assetId}`);
        return true;
    }
}
