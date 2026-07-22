import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import SettingsClient from './settings-client';

export const metadata = {
  title: 'System Settings - Admin',
  description: 'Manage system settings and feature flags',
};

export default async function AdminSettingsPage() {
  const supabase = createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    redirect('/dashboard');
  }

  // Fetch settings
  const { data: settings } = await supabase
    .from('system_settings')
    .select('*')
    .order('setting_group', { ascending: true })
    .order('setting_key', { ascending: true });

  // Fetch features
  const { data: features } = await supabase
    .from('system_features')
    .select('*')
    .order('feature_name', { ascending: true });

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
      </div>
      <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
        <SettingsClient 
          initialSettings={settings || []} 
          initialFeatures={features || []} 
        />
      </div>
    </div>
  );
}