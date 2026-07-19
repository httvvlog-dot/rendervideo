"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Settings, Check, Coins, X, Clock } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export function ExportSettingsModal({ 
  projectId, 
  activePresetId, 
  presets,
  totalDurationMs = 0
}: { 
  projectId: string, 
  activePresetId: string | null, 
  presets: any[],
  totalDurationMs?: number
}) {
  const defaultSelected = activePresetId || presets.find(p => p.is_default)?.id || (presets.length > 0 ? presets[0].id : null);
  const [selected, setSelected] = useState<string | null>(defaultSelected);
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const getCreditCost = (preset: any) => {
    if (!preset) return { credits: 5, reason: "1080p Standard", policyVersion: "1.0" };
    const pixels = preset.width * preset.height;
    
    let credits = 15;
    let resLabel = "4K";
    
    if (pixels <= 1280 * 720) {
      credits = 3; resLabel = "720p";
    } else if (pixels <= 1920 * 1080) {
      credits = 5; resLabel = "1080p";
    } else if (pixels <= 2560 * 1440) {
      credits = 8; resLabel = "1440p";
    }
    
    return {
      credits,
      reason: `${resLabel} ${preset.quality || "Standard"}`.trim(),
      policyVersion: "1.0"
    };
  };

  const getEstimatedRenderTime = (preset: any) => {
    if (!preset) return "≈ 30s";
    const durationSec = Math.max(1, totalDurationMs / 1000);
    const pixels = preset.width * preset.height;
    
    // Simple heuristic: 1 second of 1080p takes 1.5 seconds to render
    const pixelRatio = pixels / (1080 * 1920);
    const estSec = Math.round(durationSec * pixelRatio * 1.5);
    
    if (estSec < 60) return `≈ ${Math.max(5, estSec)} seconds`;
    const min = Math.floor(estSec / 60);
    const sec = estSec % 60;
    return `≈ ${min}m ${sec}s`;
  };

  const getAspectRatio = (w: number, h: number) => {
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(w, h);
    return `${w / divisor}:${h / divisor}`;
  };

  const handleSave = async () => {
    if (!selected) return;
    setIsSaving(true);
    await supabase.from("projects").update({ export_preset_id: selected }).eq("id", projectId);
    setIsSaving(false);
    setIsOpen(false);
    router.refresh();
  };

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(true)}
        className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
      >
        <Settings className="w-4 h-4 mr-2" /> Export Settings
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-semibold">Video Export Settings</h2>
                <p className="text-sm text-slate-400 mt-1">Select the output format for your final render.</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {presets.map(preset => {
                  const cost = getCreditCost(preset);
                  const aspect = getAspectRatio(preset.width, preset.height);
                  
                  return (
                    <div 
                      key={preset.id} 
                      onClick={() => setSelected(preset.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${selected === preset.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-800 hover:border-slate-600'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{preset.name} {preset.version ? `v${preset.version}` : ''}</h3>
                        {selected === preset.id && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                      </div>
                      <div className="text-xs text-slate-400 space-y-1 mb-3">
                        <div>Resolution: {preset.width}x{preset.height} ({aspect})</div>
                        <div>FPS: {preset.fps}</div>
                        <div>Quality: {preset.quality}</div>
                        <div>Codec: {preset.codec?.toUpperCase()}</div>
                      </div>
                      <div className="pt-3 border-t border-slate-700 space-y-2 text-xs font-medium text-slate-300">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center text-slate-400"><Clock className="w-3 h-3 mr-1"/> Est. Time</span>
                          <span>{getEstimatedRenderTime(preset)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center text-slate-400"><Coins className="w-3 h-3 mr-1"/> Est. Cost</span>
                          <span className="text-amber-400">{cost.credits} Credits</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end space-x-2 p-6 border-t border-slate-800 bg-slate-900/50">
              <Button variant="ghost" onClick={() => setIsOpen(false)} className="hover:bg-slate-800 text-slate-300">Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                {isSaving ? "Saving..." : "Apply Settings"}
              </Button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
