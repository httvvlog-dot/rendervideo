import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getCurrentUser } from '@/utils/auth-service';
import { BillingEngine } from '@/utils/billing/BillingEngine';
import { WalletEngine } from '@/utils/billing/WalletEngine';
import { BillingFeature } from '@/utils/billing/types';
import * as crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, num_images = 1, aspect_ratio, character_reference, garment_reference, background_reference, idempotency_key } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    // Idempotency check if idempotency_key is provided
    if (idempotency_key) {
      const { data: existingJob } = await supabase
        .from('image_jobs')
        .select('id')
        .eq('idempotency_key', idempotency_key)
        .eq('user_id', user.id)
        .single();
        
      if (existingJob) {
        return NextResponse.json({ success: true, job_id: existingJob.id, status: 'idempotent_reply' });
      }
    }

    const jobId = crypto.randomUUID();

    // 1. Calculate Charge and Reserve Credits BEFORE Enqueueing
    const chargeInfo = await BillingEngine.getChargeInfo(BillingFeature.IMAGE_GENERATION, undefined, undefined, user.id, num_images);
    
    const reserveResult = await WalletEngine.reserveCredits(
      { userId: user.id, feature: BillingFeature.IMAGE_GENERATION },
      chargeInfo,
      "image_jobs",
      jobId
    );

    if (!reserveResult.success) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
    }

    // 2. Create Image Job
    const { data: job, error: jobError } = await supabaseAdmin
      .from('image_jobs')
      .insert({
        id: jobId,
        user_id: user.id,
        status: 'PENDING',
        original_prompt: prompt,
        num_images,
        character_ref_url: character_reference,
        garment_ref_url: garment_reference,
        background_ref_url: background_reference,
        idempotency_key: idempotency_key || undefined,
        metadata: { aspect_ratio }
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error("Error creating image job:", jobError);
      // Attempt to release credits if DB insert fails
      if (reserveResult.transactionId) {
          await supabaseAdmin.rpc('release_credits', { p_transaction_id: reserveResult.transactionId, p_reason: 'Job Insert Failed' });
      }
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    return NextResponse.json({ success: true, job_id: job.id });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
