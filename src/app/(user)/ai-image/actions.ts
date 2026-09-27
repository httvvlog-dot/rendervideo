"use server"

import { createClient } from "@/utils/supabase/server"
import { MediaService } from "@/utils/media/MediaService"
import crypto from "crypto"

export async function uploadReferenceImage(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const file = formData.get("file") as File
  if (!file) return { error: "No file provided" }
  
  if (file.size > 20 * 1024 * 1024) return { error: "File size exceeds 20MB limit" }
  if (!file.type.startsWith("image/")) return { error: "Only images are allowed" }

  const extension = file.name.split('.').pop() || "png"
  const fileName = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extension}`
  
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  try {
    const contentHash = crypto.createHash("sha256").update(buffer).digest("hex")
    
    // Upload via MediaService (Asset Manager)
    const asset = await MediaService.upload(
      buffer,
      fileName,
      file.type,
      contentHash,
      user.id,
      'system', // We don't have a projectId for generic AI Image yet
      'AI_REFERENCE'
    )

    return { success: true, url: asset.public_url }
  } catch (error: any) {
    console.error("Upload error:", error)
    return { error: error.message || "Failed to upload file" }
  }
}

import { BillingEngine } from "@/utils/billing/BillingEngine"
import { BillingFeature } from "@/utils/billing/types"

export async function getImagePricing(numImages: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { credits: 0 }
  
  try {
    const charge = await BillingEngine.getChargeInfo(BillingFeature.IMAGE_GENERATION, undefined, undefined, user.id, numImages)
    return { credits: charge.credits }
  } catch (e: any) {
    console.warn("Failed to get pricing:", e.message)
    // Fallback based on MVP default logic (10 credits)
    return { credits: numImages * 10 }
  }
}

