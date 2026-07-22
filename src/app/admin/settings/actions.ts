'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateSystemSettings(formData: FormData) {
  const supabase = createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    throw new Error('Unauthorized');
  }

  // Iterate over formData to update settings
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('setting_')) {
      const settingKey = key.replace('setting_', '');
      
      await supabase
        .from('system_settings')
        .update({ 
          setting_value: value.toString(),
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', settingKey);
    }
  }

  revalidatePath('/admin/settings');
  return { success: true };
}

export async function updateSystemFeatures(formData: FormData) {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    throw new Error('Unauthorized');
  }

  // Get all features first to know which ones to set to false if omitted
  const { data: features } = await supabase.from('system_features').select('feature_name');
  
  if (features) {
    for (const feature of features) {
      const isEnabled = formData.get(`feature_${feature.feature_name}`) === 'true';
      
      await supabase
        .from('system_features')
        .update({
          is_enabled: isEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('feature_name', feature.feature_name);
    }
  }

  revalidatePath('/admin/settings');
  return { success: true };
}
