"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, RotateCcw, Trash, FileText, Loader2, Clock, Zap, DollarSign, Image as ImageIcon } from "lucide-react"
import { generateScript, deleteScriptVersion, setActiveScript } from "../script-actions"
import { getMissingImageSections } from "../media-actions"
import { generateAIImage, saveAIImage } from "../image-actions"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { ScriptSectionList } from "./script-section-list"

export function ScriptManager({ projectId, scripts, project }: { projectId: string, scripts: any[], project?: any }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeVersion, setActiveVersion] = useState<number>(scripts.length > 0 ? Math.max(...scripts.map(s => s.version)) : 0)
  const [sections, setSections] = useState<any[]>([])
  const [isLoadingSections, setIsLoadingSections] = useState(false)

  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [missingSectionsCount, setMissingSectionsCount] = useState<number | null>(null)

  const activeScript = scripts.find(s => s.version === activeVersion)
  const activeScriptId = activeScript?.id
  const supabase = createClient()

  useEffect(() => {
    async function loadSections() {
      if (!activeScriptId) return
      
      // Only show full-page loader if we don't have sections for this script yet
      if (sections.length === 0 || sections[0]?.script_id !== activeScriptId) {
        setIsLoadingSections(true)
      }
      
      const { data, error } = await supabase
        .from('script_sections')
        .select('*')
        .eq('script_id', activeScriptId)
        .order('section_index', { ascending: true })
      
      if (!error && data) {
        setSections(data)
      } else {
        setSections([])
      }
      setIsLoadingSections(false)
    }
    loadSections()
  }, [activeScriptId, supabase])

  useEffect(() => {
    async function checkMissing() {
      if (!activeScriptId) return
      try {
         const missing = await getMissingImageSections(activeScriptId);
         setMissingSectionsCount(missing.length);
      } catch(e) {
         setMissingSectionsCount(0);
      }
    }
    if (sections.length > 0) {
      checkMissing();
    }
  }, [activeScriptId, sections])

  const handleGenerateAllImages = async () => {
    if (!activeScriptId) return
    setIsGeneratingAll(true)
    try {
      const missingSections = await getMissingImageSections(activeScriptId);
      if (missingSections.length === 0) {
        toast.info("All sections already have images.")
        return;
      }
      
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < missingSections.length; i++) {
         const section = missingSections[i];
         const toastId = toast.loading(`Đang tạo ảnh ${i + 1}/${missingSections.length}...`);
         try {
             const res = await generateAIImage(projectId, section.id);
             if (res && typeof res === 'object' && 'error' in res && res.error) {
                 const errStr = String(res.error).toLowerCase();
                 if (errStr.includes("credit") || errStr.includes("balance") || errStr.includes("số dư")) {
                     toast.error("Hết Credit. Đã dừng tiến trình.", { id: toastId });
                     break; 
                 }
                 toast.error(`Lỗi section ${section.section_index}: ${res.error}`, { id: toastId });
                 failCount++;
                 continue; 
             }
             
             toast.loading(`Đang lưu ảnh ${i + 1}/${missingSections.length}...`, { id: toastId });
             
             const data = res as { url: string; width: number; height: number; };
             if (!data.url) throw new Error("No URL returned from AI generation");
             
             const saveRes = await saveAIImage(projectId, section.id, data.url, `ai_img_${section.id}.png`);
             if (saveRes && 'error' in saveRes && saveRes.error) {
                 toast.error(`Lỗi lưu ảnh section ${section.section_index}: ${saveRes.error}`, { id: toastId });
                 failCount++;
                 continue;
             }
             
             // Notify SectionMediaUploader to refresh its local state without a page reload
             window.dispatchEvent(
               new CustomEvent("hatara:section-media-updated", {
                 detail: { sectionId: section.id }
               })
             )
             
             toast.success(`Tạo thành công ảnh ${i + 1}/${missingSections.length}`, { id: toastId });
             successCount++;
         } catch (err: any) {
             toast.error(`Lỗi hệ thống: ${err.message}`, { id: toastId });
             failCount++;
         }
      }
      
      toast.success(`Hoàn tất Auto AI Image: ${successCount} thành công, ${failCount} thất bại.`);
      setMissingSectionsCount(0);
    } catch (e: any) {
      toast.error(e.message || "Lỗi khởi tạo tiến trình batch");
    } finally {
      setIsGeneratingAll(false)
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    const toastId = toast.loading("Generating script...")
    try {
      const res = await generateScript(projectId)
      if (res && res.error) {
        toast.error(res.error, { id: toastId })
        return
      }
      toast.success("Script generated successfully!", { id: toastId })
      // When generating a new script, we don't automatically set it as the active version for timeline,
      // but we do show it in the UI.
      const maxV = scripts.length > 0 ? Math.max(...scripts.map(s => s.version)) : 0
      setActiveVersion(maxV + 1)
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred", { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDelete = async () => {
    if (!activeScript) return
    if (!confirm(`Are you sure you want to delete Version ${activeScript.version}?`)) return
    
    toast.loading("Deleting...", { id: 'del' })
    try {
      const res = await deleteScriptVersion(activeScript.id, projectId)
      if (res && res.error) {
        toast.error(res.error, { id: 'del' })
        return
      }
      toast.success("Deleted", { id: 'del' })
      const remaining = scripts.filter(s => s.id !== activeScript.id)
      if (remaining.length > 0) {
        setActiveVersion(Math.max(...remaining.map(s => s.version)))
      } else {
        setActiveVersion(0)
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred", { id: 'del' })
    }
  }

  const handleSetActive = async () => {
    if (!activeScript) return
    const toastId = toast.loading("Setting active script...")
    try {
      const res = await setActiveScript(projectId, activeScript.id)
      if (res && res.error) {
        toast.error(res.error, { id: toastId })
        return
      }
      toast.success("Active script updated", { id: toastId })
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred", { id: toastId })
    }
  }

  if (scripts.length === 0) {
    return (
      <div className="relative rounded-xl p-[1px] bg-gradient-to-br from-purple-500 via-violet-500 to-cyan-400 shadow-[0_0_20px_rgba(139,92,246,0.15)] max-sm:shadow-none mt-6 group">
        <Card className="border-0 shadow-none bg-slate-50 dark:bg-slate-950 rounded-[11px] h-full w-full">
          <CardContent className="flex flex-col items-center justify-center h-48 text-center pt-6">
            <FileText className="h-10 w-10 text-indigo-400 mb-4 opacity-80" />
            <h2 className="text-lg font-semibold">No Script Generated</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Start the AI pipeline by generating the initial video script.</p>
            <Button onClick={handleGenerate} disabled={isGenerating} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 shadow-md shadow-indigo-500/20 active:scale-[0.98] transition-all duration-200">
              {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <><Play className="mr-2 h-4 w-4" /> Generate Script</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-4 min-w-0">
      {isGeneratingAll && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-md text-amber-800 dark:text-amber-300 text-sm flex items-center shadow-sm">
          <Loader2 className="h-4 w-4 mr-3 animate-spin shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Đang tự động tạo ảnh. <strong>Vui lòng không rời trang hoặc tải lại trang cho đến khi hoàn tất.</strong> Việc rời trang sẽ làm gián đoạn tiến trình.</span>
        </div>
      )}
      
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-4 gap-4 min-w-0">
        <div className="flex items-center flex-wrap gap-2 sm:gap-4 min-w-0">
          <h2 className="text-lg font-semibold flex items-center min-w-0 shrink-0">
            <FileText className="h-5 w-5 mr-2 text-indigo-500 shrink-0" /> Script Manager
          </h2>
          {project?.active_script_id === activeScript?.id ? (
            <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs rounded-md font-medium border border-green-200 whitespace-nowrap">
              Active for Timeline
            </span>
          ) : (
            <Button onClick={handleSetActive} variant="outline" size="sm" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 whitespace-nowrap active:scale-[0.98] transition-all duration-200">
              Set as Active Version
            </Button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center w-full xl:w-auto gap-2 min-w-0 shrink-0">
          <select 
            value={activeVersion} 
            onChange={(e) => setActiveVersion(Number(e.target.value))}
            className="border rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-900 font-medium w-full sm:w-auto min-w-0"
          >
            {scripts.map(s => (
              <option key={s.id} value={s.version}>Version {s.version} {s.id === project?.active_script_id ? "(Active)" : ""} ({new Date(s.created_at).toLocaleTimeString()})</option>
            ))}
          </select>
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto hide-scrollbar shrink-0">
            {missingSectionsCount !== null && missingSectionsCount > 0 && (
              <Button onClick={handleGenerateAllImages} disabled={isGeneratingAll || isGenerating} variant="default" size="sm" className="bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all duration-200 shadow-md shadow-indigo-500/20 whitespace-nowrap shrink-0 hidden lg:flex">
                 {isGeneratingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                 Generate All Images ({missingSectionsCount})
              </Button>
            )}
            {missingSectionsCount !== null && missingSectionsCount > 0 && (
              <Button onClick={handleGenerateAllImages} disabled={isGeneratingAll || isGenerating} variant="default" size="icon" className="bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all duration-200 shadow-md shadow-indigo-500/20 shrink-0 lg:hidden" title={`Generate All Images (${missingSectionsCount})`}>
                 {isGeneratingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              </Button>
            )}
            <Button onClick={handleGenerate} disabled={isGenerating || isGeneratingAll} variant="outline" size="sm" className="flex-1 sm:flex-none active:scale-[0.98] transition-all duration-200 whitespace-nowrap">
               {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
               Regenerate
            </Button>
            <Button onClick={handleDelete} variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 shrink-0 hidden sm:flex" title="Delete">
               <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {activeScript && (
        <Card className="border-0 shadow-none sm:border sm:shadow-sm">
          <div className="border-b bg-slate-50 dark:bg-slate-900 px-4 py-2 flex items-center overflow-x-auto hide-scrollbar whitespace-nowrap gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="flex items-center shrink-0"><Zap className="h-3.5 w-3.5 mr-1" /> {activeScript.model}</span>
            <span className="flex items-center shrink-0"><Clock className="h-3.5 w-3.5 mr-1" /> {activeScript.latency_ms}ms</span>
            <span className="shrink-0">Tokens: {activeScript.tokens_input} in / {activeScript.tokens_output} out</span>
            <span className="flex items-center shrink-0"><DollarSign className="h-3.5 w-3.5 mr-0.5" /> {activeScript.cost || 0}</span>
            <span className="shrink-0">{activeScript.word_count} words</span>
          </div>
          <CardContent className="p-0 sm:p-4 bg-slate-100/50 dark:bg-slate-900/20">
            {isLoadingSections ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              </div>
            ) : sections.length > 0 && project ? (
              <ScriptSectionList project={project} sections={sections} />
            ) : (
              <textarea 
                readOnly 
                className="w-full h-80 p-4 bg-white dark:bg-slate-900 border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans leading-relaxed text-slate-800 dark:text-slate-200"
                value={activeScript.content}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
