"use client";

import { useState, useTransition } from "react";
import { Play, Check, ChevronDown, Loader2 } from "lucide-react";
import { updateProjectVoice } from "../../actions";
import { toast } from "sonner";

export function VoiceSelector({ 
  projectId,
  voices, 
  defaultVoiceId 
}: { 
  projectId: string;
  voices: any[]; 
  defaultVoiceId?: string;
}) {
  const [selected, setSelected] = useState(defaultVoiceId || "");
  const [isOpen, setIsOpen] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSelect = (id: string) => {
    setSelected(id);
    setIsOpen(false);
    
    startTransition(async () => {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('voice-change-start'));
      try {
        const res = await updateProjectVoice(projectId, id);
        if (res && !res.success) {
          toast.error(res.error || "Failed to update project voice");
          // Revert selection on failure
          setSelected(defaultVoiceId || "");
        }
      } catch (err) {
        console.error("Failed to update project voice", err);
        toast.error("An unexpected error occurred");
        setSelected(defaultVoiceId || "");
      } finally {
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('voice-change-end'));
      }
    });
  };

  const playPreview = (e: React.MouseEvent, url: string, voiceId: string) => {
    e.stopPropagation();
    if (!url) return;
    if (currentlyPlaying === voiceId) {
      setCurrentlyPlaying(null);
      return;
    }
    const audio = new Audio(url);
    audio.play();
    setCurrentlyPlaying(voiceId);
    audio.onended = () => setCurrentlyPlaying(null);
  };

  const selectedVoice = voices.find(v => v.id === selected);

  if (!voices || voices.length === 0) {
    return (
      <div className="text-sm text-slate-500 italic">No voices available</div>
    );
  }

  return (
    <div className="relative">
      <div className="flex flex-col mb-1">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center">
          Project Voice
          {isPending ? (
            <span className="ml-2 text-yellow-500 normal-case tracking-normal text-[10px] flex items-center">
              Saving...
            </span>
          ) : (
            <span className="ml-2 text-green-500 normal-case tracking-normal text-[10px] flex items-center">
              <Check className="w-3 h-3 mr-1" /> Saved
            </span>
          )}
        </span>
      </div>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-64 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex flex-col items-start truncate">
          <span className="font-semibold">{selectedVoice?.display_name || "Select Voice"}</span>
          <span className="text-xs text-slate-500 truncate w-48 text-left">{selectedVoice?.description || "No description"}</span>
        </div>
        {isPending ? (
          <Loader2 className="w-4 h-4 text-slate-400 shrink-0 ml-2 animate-spin" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-xl z-50">
          {voices.map(voice => (
            <div 
              key={voice.id}
              onClick={() => handleSelect(voice.id)}
              className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0"
            >
              <div className="flex flex-col w-52">
                <span className="font-semibold text-sm flex items-center gap-2">
                  {voice.display_name}
                  {selected === voice.id && <Check className="w-3 h-3 text-blue-500" />}
                </span>
                <span className="text-xs text-slate-500 truncate">{voice.description || voice.category}</span>
              </div>
              
              {voice.preview_url && (
                <button 
                  onClick={(e) => playPreview(e, voice.preview_url, voice.id)}
                  className={`p-2 rounded-full transition-colors shrink-0 ${currentlyPlaying === voice.id ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'}`}
                >
                  <Play className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
