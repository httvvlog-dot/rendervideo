'use client';

import { useState, useTransition } from 'react';
import { updateSystemSettings, updateSystemFeatures } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function SettingsClient({ 
  initialSettings, 
  initialFeatures 
}: { 
  initialSettings: any[],
  initialFeatures: any[]
}) {
  const [isPendingSettings, startTransitionSettings] = useTransition();
  const [isPendingFeatures, startTransitionFeatures] = useTransition();

  // Group settings for UI
  const groupedSettings = initialSettings.reduce((acc, curr) => {
    const group = curr.setting_group || 'General';
    if (!acc[group]) acc[group] = [];
    acc[group].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  const handleSaveSettings = async (formData: FormData) => {
    startTransitionSettings(async () => {
      try {
        await updateSystemSettings(formData);
        toast.success('System settings saved successfully');
      } catch (e) {
        toast.error('Failed to save settings');
      }
    });
  };

  const handleSaveFeatures = async (formData: FormData) => {
    startTransitionFeatures(async () => {
      try {
        await updateSystemFeatures(formData);
        toast.success('System features updated successfully');
      } catch (e) {
        toast.error('Failed to update features');
      }
    });
  };

  return (
    <Tabs defaultValue="settings" className="space-y-4">
      <TabsList>
        <TabsTrigger value="settings">Global Settings</TabsTrigger>
        <TabsTrigger value="features">Feature Flags</TabsTrigger>
      </TabsList>
      
      <TabsContent value="settings" className="space-y-4">
        <form action={handleSaveSettings}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(groupedSettings).map(([groupName, settings]) => (
              <Card key={groupName} className="col-span-1">
                <CardHeader>
                  <CardTitle className="capitalize">{groupName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings.map((setting) => (
                    <div key={setting.setting_key} className="space-y-2">
                      <Label htmlFor={setting.setting_key}>
                        {setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Label>
                      
                      {setting.value_type === 'boolean' ? (
                        <div className="flex items-center space-x-2">
                          <Switch 
                            id={setting.setting_key} 
                            name={`setting_${setting.setting_key}`} 
                            defaultChecked={setting.setting_value === 'true'} 
                            value="true"
                          />
                          <span className="text-sm text-muted-foreground">{setting.description}</span>
                        </div>
                      ) : setting.value_type === 'number' ? (
                        <div>
                          <Input 
                            id={setting.setting_key}
                            name={`setting_${setting.setting_key}`}
                            type="number"
                            defaultValue={setting.setting_value}
                          />
                          <p className="text-xs text-muted-foreground mt-1">{setting.description}</p>
                        </div>
                      ) : (
                        <div>
                          <Input 
                            id={setting.setting_key}
                            name={`setting_${setting.setting_key}`}
                            type="text"
                            defaultValue={setting.setting_value}
                          />
                          <p className="text-xs text-muted-foreground mt-1">{setting.description}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={isPendingSettings}>
              {isPendingSettings ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </TabsContent>

      <TabsContent value="features">
        <Card>
          <CardHeader>
            <CardTitle>System Feature Flags</CardTitle>
            <CardDescription>
              Toggle specific enterprise modules on or off without deploying code.
            </CardDescription>
          </CardHeader>
          <form action={handleSaveFeatures}>
            <CardContent className="space-y-6">
              {initialFeatures.map((feature) => (
                <div key={feature.feature_name} className="flex items-center justify-between space-x-2 border-b pb-4 last:border-0 last:pb-0">
                  <div className="space-y-0.5">
                    <Label htmlFor={feature.feature_name} className="text-base">
                      {feature.feature_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                  <Switch
                    id={feature.feature_name}
                    name={`feature_${feature.feature_name}`}
                    defaultChecked={feature.is_enabled}
                    value="true"
                  />
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isPendingFeatures} className="ml-auto">
                {isPendingFeatures ? 'Applying...' : 'Apply Feature Flags'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
