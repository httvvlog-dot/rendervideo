import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { MediaService } from '@/utils/media/MediaService';

export async function POST(req: Request) {
  // Normally secured by API Key or Admin Middleware
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Find assets created more than 1 hour ago that are still CREATED (never attached) or explicitly ORPHANED
  const { data: candidates, error } = await supabase
    .from('storage_files')
    .select('id, path')
    .in('status', ['CREATED', 'ORPHANED'])
    .lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = {
    total: candidates.length,
    success: 0,
    failed: 0,
    failures: [] as string[]
  };

  for (const asset of candidates) {
    try {
      await MediaService.delete(asset.id);
      results.success++;
    } catch (e: any) {
      results.failed++;
      results.failures.push(`Failed to delete ${asset.id}: ${e.message}`);
    }
  }

  return NextResponse.json(results);
}
