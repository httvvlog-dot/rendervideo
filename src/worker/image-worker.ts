import { createClient } from '@supabase/supabase-js';
import { BillingEngine } from '../utils/billing/BillingEngine';
import { BillingFeature, IMAGE_JOB_REFERENCE_TYPE } from '../utils/billing/types';
import { ProviderRuntime } from '../utils/provider-runtime';
import { AdapterRegistry } from '../utils/provider-runtime/adapters';
import { ImageProviderAdapter } from '../utils/provider-runtime/adapters/image-adapters';
import { PipelineStep } from '../utils/provider-runtime/types';
import { MediaService } from '../utils/media/MediaService';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const WORKER_ID = `image-worker-${Math.random().toString(36).substring(2, 9)}`;

async function claimNextJob() {
  const { data, error } = await supabase.rpc('claim_next_image_job', { p_worker_id: WORKER_ID });
  if (error) {
    console.error('Error claiming job:', error);
    return null;
  }
  return data;
}

export async function processImageJobs() {
  console.log(`Image Worker ${WORKER_ID} Started`);
  while (true) {
    try {
      const job = await claimNextJob();
      if (!job || !job.id) {
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }

      console.log(`[Worker ${WORKER_ID}] Processing Job: ${job.id} (Attempt ${job.attempt_count})`);

      try {
        const finalImages = await BillingEngine.executeAndCharge(
          { feature: BillingFeature.IMAGE_GENERATION, userId: job.user_id, projectId: job.project_id || 'system' },
          { quantity: job.num_images, description: 'AI Image Generation', referenceType: IMAGE_JOB_REFERENCE_TYPE, referenceId: job.id },
          async (provider, model) => {
            let runtimeRes: any;
            
            if (job.provider_result) {
              // Crash recovery: use intermediate provider result if exists
              runtimeRes = job.provider_result;
              console.log(`[Worker ${WORKER_ID}] Resuming from saved provider result for job ${job.id}`);
            } else {
              const adapter = AdapterRegistry.get(provider) as unknown as ImageProviderAdapter;
              if (!adapter || !adapter.generate) throw new Error(`Image Adapter for provider ${provider} not found`);

              const runtime = new ProviderRuntime(provider);
              runtimeRes = await runtime.invoke(
                async (cred) => adapter.generate(cred, {
                  prompt: job.original_prompt,
                  numImages: job.num_images,
                  character_reference: job.character_ref_url,
                  garment_reference: job.garment_ref_url,
                  background_reference: job.background_ref_url,
                  model: model
                }),
                { step: 'IMAGE' as PipelineStep, projectId: job.project_id || 'system' }
              );

              if (!runtimeRes.success) {
                 throw new Error(runtimeRes.message || 'Generation failed');
              }
              
              const outputImages = runtimeRes.data?.images || [];
              if (outputImages.length !== job.num_images) {
                // Partial Output E2E Test handling
                throw new Error(`Partial output failure: Expected ${job.num_images} images, but got ${outputImages.length}. Billing aborted.`);
              }

              // Save intermediate state to prevent duplicate AI calls
              const { data: updateRes, error: updateErr } = await supabase.from('image_jobs')
                .update({ provider_result: runtimeRes })
                .eq('id', job.id)
                .eq('worker_id', WORKER_ID)
                .select('id');
              
              if (updateErr || !updateRes || updateRes.length === 0) {
                 throw new Error('ZOMBIE_WORKER_FENCING: Lost job ownership during provider execution');
              }
            }

            const outputImages = runtimeRes.data?.images || [];
            
            // Re-verify ownership before heavy R2 persistence
            const { data: verifyRes } = await supabase.from('image_jobs').select('id').eq('id', job.id).eq('worker_id', WORKER_ID);
            if (!verifyRes || verifyRes.length === 0) {
                 throw new Error('ZOMBIE_WORKER_FENCING: Lost job ownership before R2 upload');
            }

            // Download and Upload to R2 Persistence
            const persistedImages = [];
            try {
              for (const img of outputImages) {
                 console.log(`[Worker ${WORKER_ID}] Downloading image from ${img.url}`);
                 const imgRes = await fetch(img.url);
                 if (!imgRes.ok) throw new Error(`Failed to download image from provider: ${imgRes.statusText}`);
                 const arrayBuffer = await imgRes.arrayBuffer();
                 const buffer = Buffer.from(arrayBuffer);
                 const hash = crypto.createHash('sha256').update(buffer).digest('hex');
                 
                 const uploaded = await MediaService.upload(
                   buffer, 
                   `ai_img_${job.id}_${img.index}.png`, 
                   'image/png', 
                   hash, 
                   job.user_id, 
                   job.project_id || 'system', 
                   'AI_IMAGE'
                 );
                 
                 persistedImages.push({
                   id: uploaded.id,
                   url: uploaded.public_url,
                   width: img.width,
                   height: img.height,
                   index: img.index
                 });
              }
            } catch (err: any) {
               console.error(`[Worker ${WORKER_ID}] R2 Partial Failure during upload loop. Compensating...`);
               // Immediate Compensation for partial R2 failure
               for (const pImg of persistedImages) {
                   if (pImg.id) {
                       await MediaService.delete(pImg.id).catch(e => {
                           console.error(`[Worker ${WORKER_ID}] Failed to cleanly rollback asset ${pImg.id}: ${e.message}`);
                           // Left as CREATED, cron job will GC it later.
                       });
                   }
               }
               // Throw exception to abort billing transaction
               throw new Error(`R2 Persistence Failure: ${err.message}`);
            }

            // Successfully uploaded all. Let's ATTACH them to the job to prevent GC.
            for (const pImg of persistedImages) {
                if (pImg.id) {
                    await import("@/utils/media/ReferenceManager").then(m => m.ReferenceManager.attach(pImg.id, 'image_jobs', job.id)).catch(e => console.error(`[Worker ${WORKER_ID}] Failed to attach asset: ${e.message}`));
                }
            }

            return {
              result: persistedImages,
              usage: runtimeRes.usage
            };
          }
        );

        // Update Job Success - Final Fencing Check
        const { data: finalUpdateRes } = await supabase.from('image_jobs').update({
          status: 'COMPLETED',
          output_images: finalImages,
          updated_at: new Date().toISOString()
        }).eq('id', job.id).eq('worker_id', WORKER_ID).select('id');

        if (!finalUpdateRes || finalUpdateRes.length === 0) {
           console.warn(`[Worker ${WORKER_ID}] Job ${job.id} COMPLETED but ownership was lost. Assuming another worker finalized it.`);
        } else {
           console.log(`[Worker ${WORKER_ID}] Job ${job.id} COMPLETED`);
        }

      } catch (err: any) {
        if (err.message?.includes('ZOMBIE_WORKER_FENCING')) {
           console.warn(`[Worker ${WORKER_ID}] Job ${job.id} aborted cleanly due to fencing.`);
           continue;
        }

        console.error(`[Worker ${WORKER_ID}] Job ${job.id} FAILED:`, err.message);
        
        const isTransient = err.message.includes('429') || err.message.includes('timeout') || err.message.includes('fetch');
        const maxAttempts = 3;
        
        if (isTransient && job.attempt_count < maxAttempts) {
          // Retry later (Reset status to PENDING)
          await supabase.from('image_jobs').update({
            status: 'PENDING',
            last_error: err.message,
            updated_at: new Date().toISOString()
          }).eq('id', job.id).eq('worker_id', WORKER_ID);
          console.log(`[Worker ${WORKER_ID}] Job ${job.id} marked for RETRY (${job.attempt_count}/${maxAttempts})`);
        } else {
          // Permanent failure
          await supabase.from('image_jobs').update({
            status: 'FAILED',
            last_error: err.message,
            updated_at: new Date().toISOString()
          }).eq('id', job.id).eq('worker_id', WORKER_ID);
        }
      }

    } catch (err) {
      console.error('Worker loop error:', err);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

if (require.main === module) {
  processImageJobs().catch(console.error);
}
