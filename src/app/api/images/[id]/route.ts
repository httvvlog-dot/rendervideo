import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/utils/auth-service';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createClient();

    const { data: job, error: jobError } = await supabase
      .from('image_jobs')
      .select('id, status, output_images, last_error, num_images, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
