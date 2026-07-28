import { createAdminClient } from "@/utils/supabase/admin";
import { AssetStatus } from "./MediaService";

export class ReferenceManager {
    /**
     * Attaches an asset to a business entity and updates the reference count.
     */
    static async attach(assetId: string, entityType: string, entityId: string): Promise<void> {
        const adminClient = createAdminClient();

        // 1. Insert into Single Source of Truth
        const { error: attachError } = await adminClient
            .from("asset_references")
            .insert({
                asset_id: assetId,
                entity_type: entityType,
                entity_id: entityId
            });

        // Ignore unique constraint violation if already attached
        if (attachError && attachError.code !== '23505') {
            throw new Error(`Failed to attach asset: ${attachError.message}`);
        }

        // 2. Count references (Source of Truth)
        const { count, error: countError } = await adminClient
            .from("asset_references")
            .select("*", { count: 'exact', head: true })
            .eq("asset_id", assetId);

        if (countError) {
            console.error(`Failed to count references for asset ${assetId}:`, countError);
            return;
        }

        // 3. Update storage_files cache and status
        await adminClient
            .from("storage_files")
            .update({ 
                cached_reference_count: count || 1,
                status: 'ATTACHED' as AssetStatus,
                orphaned_at: null // Clear orphaned state
            })
            .eq("id", assetId);
    }

    /**
     * Detaches an asset from a business entity and updates the reference count.
     * If references drop to 0, marks the asset as ORPHANED.
     */
    static async detach(assetId: string, entityType: string, entityId: string): Promise<void> {
        const adminClient = createAdminClient();

        // 1. Delete from Single Source of Truth
        const { error: detachError } = await adminClient
            .from("asset_references")
            .delete()
            .eq("asset_id", assetId)
            .eq("entity_type", entityType)
            .eq("entity_id", entityId);

        if (detachError) {
            throw new Error(`Failed to detach asset: ${detachError.message}`);
        }

        // 2. Count remaining references (Source of Truth)
        const { count, error: countError } = await adminClient
            .from("asset_references")
            .select("*", { count: 'exact', head: true })
            .eq("asset_id", assetId);

        if (countError) {
            console.error(`Failed to count references for asset ${assetId}:`, countError);
            return;
        }

        const remaining = count || 0;

        // 3. Update storage_files cache and handle GC marking
        const updateData: any = { cached_reference_count: remaining };
        
        if (remaining === 0) {
            updateData.status = 'ORPHANED' as AssetStatus;
            updateData.orphaned_at = new Date().toISOString();
        }

        await adminClient
            .from("storage_files")
            .update(updateData)
            .eq("id", assetId);
    }
}
