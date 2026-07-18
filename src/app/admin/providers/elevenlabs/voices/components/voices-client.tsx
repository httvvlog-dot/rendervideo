"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Download, Play, Search, Filter, PowerOff } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export function VoicesClient({ initialVoices, availableModels = [] }: { initialVoices: any[], availableModels?: any[] }) {
  const router = useRouter();
  const [voices, setVoices] = useState(initialVoices);

  // Keep local state in sync with server component data when router.refresh() is called
  useEffect(() => {
    setVoices(initialVoices);
  }, [initialVoices]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [importId, setImportId] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("active"); // all, active, inactive
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [testingVoiceId, setTestingVoiceId] = useState<string | null>(null);

  const supabase = createClient();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/admin/voices/sync");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`Sync complete! Inserted: ${data.inserted}, Updated: ${data.updated}, Deactivated: ${data.deactivated}`);
      router.refresh();
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeactivateAll = async () => {
    if (!confirm("Are you sure you want to deactivate ALL voices? You can re-enable them one by one.")) return;
    const { error } = await supabase
      .from('voice_presets')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy condition to update all
    
    if (!error) {
      setVoices(voices.map(v => ({ ...v, is_active: false })));
      alert("All voices have been deactivated.");
    } else {
      alert(`Failed to deactivate: ${error.message}`);
    }
  };

  const handleImport = async () => {
    if (!importId.trim()) return;
    setIsImporting(true);
    try {
      const res = await fetch("/api/admin/voices/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: importId.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert("Voice imported successfully!");
      setImportId("");
      router.refresh();
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('voice_presets')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    if (!error) {
      setVoices(voices.map(v => v.id === id ? { ...v, is_active: !currentStatus } : v));
    }
  };

  const handleUpdate = async (id: string, field: string, value: string) => {
    const { error } = await supabase
      .from('voice_presets')
      .update({ [field]: value })
      .eq('id', id);
    if (!error) {
      setVoices(voices.map(v => v.id === id ? { ...v, [field]: value } : v));
    }
  };

  const playPreview = (url: string, voiceId: string) => {
    if (!url) return;
    if (currentlyPlaying === voiceId) {
      setCurrentlyPlaying(null); // Simple toggle logic could be improved with actual Audio element tracking
      return;
    }
    const audio = new Audio(url);
    audio.play();
    setCurrentlyPlaying(voiceId);
    audio.onended = () => setCurrentlyPlaying(null);
  };

  const handleTestVoice = async (voice: any) => {
    if (testingVoiceId) return;
    setTestingVoiceId(voice.id);
    try {
      const res = await fetch("/api/admin/voices/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: voice.id })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to generate test audio");
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
      
    } catch (err: any) {
      alert(`Test failed: ${err.message}`);
    } finally {
      setTestingVoiceId(null);
    }
  };

  const filteredVoices = voices.filter(v => {
    const matchesSearch = v.name?.toLowerCase().includes(search.toLowerCase()) || 
                          v.display_name?.toLowerCase().includes(search.toLowerCase()) ||
                          v.voice_id?.toLowerCase().includes(search.toLowerCase()) ||
                          v.description?.toLowerCase().includes(search.toLowerCase());
                          
    if (!matchesSearch) return false;
    
    if (activeFilter === 'active' && !v.is_active) return false;
    if (activeFilter === 'inactive' && v.is_active) return false;
    
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            placeholder="Voice ID to import..." 
            className="px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700 text-sm w-64"
            value={importId}
            onChange={(e) => setImportId(e.target.value)}
          />
          <button 
            onClick={handleImport}
            disabled={isImporting || !importId.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isImporting ? "Importing..." : "Add by ID"}
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDeactivateAll}
            className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <PowerOff className="w-4 h-4" />
            Disable All
          </button>

          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing Voices..." : "Sync All Voices"}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, ID, description..." 
            className="w-full pl-9 pr-4 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-800 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            className="border rounded-md px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-800"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Preview</th>
                <th className="px-6 py-4">Display Name</th>
                <th className="px-6 py-4">Original Name</th>
                <th className="px-6 py-4">Model Override</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-center">Active</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredVoices.map((voice) => (
                <tr key={voice.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4">
                    {voice.preview_url ? (
                      <button 
                        onClick={() => playPreview(voice.preview_url, voice.voice_id)}
                        className={`p-2 rounded-full transition-colors ${currentlyPlaying === voice.voice_id ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'}`}
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs">No Preview</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="text" 
                      defaultValue={voice.display_name}
                      onBlur={(e) => {
                        if (e.target.value !== voice.display_name) {
                          handleUpdate(voice.id, 'display_name', e.target.value);
                        }
                      }}
                      className="bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none py-1 w-32 font-medium"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{voice.name}</div>
                    <div className="text-xs text-slate-500">{voice.voice_id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      className="bg-transparent border border-slate-200 dark:border-slate-700 rounded-md py-1 px-2 text-sm max-w-[150px] outline-none focus:ring-1 focus:ring-blue-500"
                      value={voice.model_id || ""}
                      onChange={(e) => handleUpdate(voice.id, 'model_id', e.target.value === "" ? null : e.target.value)}
                    >
                      <option value="">(Provider Default)</option>
                      {availableModels.map(m => (
                        <option key={m.model_id} value={m.model_id}>{m.name || m.model_id}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                      {voice.category || 'unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => toggleActive(voice.id, voice.is_active)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${voice.is_active ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                      <span className="sr-only">Toggle active</span>
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${voice.is_active ? 'translate-x-2' : '-translate-x-2'}`} />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleTestVoice(voice)}
                      disabled={testingVoiceId === voice.id || !voice.is_active}
                      className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1 rounded-md transition-colors disabled:opacity-50"
                    >
                      {testingVoiceId === voice.id ? "Testing..." : "Test"}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredVoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No voices found. Try syncing from ElevenLabs or adjust your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
