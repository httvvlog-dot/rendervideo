"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Image as ImageIcon, Check, X, Edit2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react"
import { updateScriptSection } from "../script-actions"
import { toast } from "sonner"
import { SectionMediaUploader } from "./section-media-uploader"

export function ScriptSectionCard({ section, projectId, startTime, canGenerateImage = true }: { section: any, projectId: string, startTime: number, canGenerateImage?: boolean }) {
  const sectionHeaderRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  useEffect(() => {
    if (isEditing) {
      setIsOpen(true)
    }
  }, [isEditing])

  const [formData, setFormData] = useState({
    title: section.title || "",
    narration: section.narration || "",
    visual_description: section.visual_description || "",
    image_prompt: section.image_prompt || "",
    recommended_image_count: section.recommended_image_count || 1,
    keywords: section.keywords ? section.keywords.join(", ") : "",
    transition_type: section.transition_type || "fade",
    transition_duration: section.transition_duration || 0.5
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateScriptSection(section.id, projectId, {
        ...formData,
        keywords: formData.keywords.split(",").map((k: string) => k.trim()).filter((k: string) => k)
      })
      toast.success("Section updated")
      setIsEditing(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Estimated words per second: ~2.5 (Vietnamese speaking pace)
  const wordCount = formData.narration.trim().split(/\s+/).filter((w: string) => w.length > 0).length
  const estimatedSeconds = wordCount / 2.5
  const isNarrationTooLong = estimatedSeconds > section.duration_seconds + 1 // +1s grace period

  const handleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(false)
    
    requestAnimationFrame(() => {
      sectionHeaderRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    })
  }

  return (
    <div 
      ref={sectionHeaderRef}
      className={`mb-4 scroll-mt-24 group relative rounded-xl transition-all duration-300 sm:p-[1px] sm:hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] ${
        isOpen ? 'bg-gradient-to-br from-purple-500/80 via-violet-500/80 to-cyan-400/80 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-transparent sm:hover:bg-gradient-to-br sm:hover:from-purple-500/50 sm:hover:via-violet-500/50 sm:hover:to-cyan-400/50'
      }`}
    >
      <Card 
        className={`overflow-hidden border-0 shadow-none sm:border sm:shadow-sm h-full w-full transition-colors sm:rounded-[11px] ${
          isOpen ? 'sm:border-transparent' : 'border-slate-200 dark:border-slate-800 group-hover:sm:border-transparent'
        }`}
      >
      <CardHeader 
        className={`py-3 px-4 border-b flex flex-row items-center justify-between cursor-pointer transition-colors ${
          isOpen 
            ? "bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900" 
            : "bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800"
        }`}
        onClick={() => !isEditing && setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-4">
          <div className="flex flex-col">
            <span className={`text-xs font-bold uppercase tracking-wider ${isOpen ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500"}`}>Section {section.section_index}</span>
            <CardTitle className="text-base">{isEditing ? <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="h-9 sm:h-7 text-sm mt-1" /> : <span className={isOpen ? "text-indigo-900 dark:text-indigo-100" : ""}>{section.title || `Section ${section.section_index}`}</span>}</CardTitle>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded border hidden sm:block">
            {formatTime(startTime)} - {formatTime(startTime + section.duration_seconds)}
            <span className="ml-2 text-indigo-500 font-semibold">{section.duration_seconds}s</span>
          </div>
          <div className="text-sm font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded border sm:hidden">
            <span className="text-indigo-500 font-semibold">{section.duration_seconds}s</span>
          </div>
          {!isEditing ? (
            <div className="flex space-x-1 sm:space-x-2">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setIsEditing(true) }}><Edit2 className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" className="xl:hidden">
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          ) : (
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setIsEditing(false) }} disabled={isSaving} className="active:scale-[0.98] transition-all duration-200"><X className="h-4 w-4 text-red-500" /></Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleSave() }} disabled={isSaving} className="active:scale-[0.98] transition-all duration-200"><Check className="h-4 w-4 text-green-500" /></Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className={`p-0 sm:p-4 gap-6 ${isOpen ? "flex flex-col pt-4 sm:pt-4" : "hidden xl:flex xl:flex-col xl:p-4 xl:pt-4"}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Left Column: Narration */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Narration</h4>
          {isEditing ? (
            <textarea 
              value={formData.narration} 
              onChange={e => setFormData({...formData, narration: e.target.value})} 
              className="min-h-[120px] resize-y w-full p-2 border rounded-md text-sm"
            />
          ) : (
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-md min-h-[120px]">
              {section.narration}
            </p>
          )}
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">{wordCount} words</span>
            {isNarrationTooLong && (
              <span className="text-amber-600 dark:text-amber-500 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" /> Might be too long for {section.duration_seconds}s
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Visuals & Images Placeholder */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Visual Description</h4>
            {isEditing ? (
              <textarea 
                value={formData.visual_description} 
                onChange={e => setFormData({...formData, visual_description: e.target.value})}
                className="text-sm h-20 resize-none w-full p-2 border rounded-md"
              />
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                  "{section.visual_description}"
                </p>
                {section.image_prompt && (
                  <div>
                    <h5 className="text-xs font-semibold text-slate-500 mb-1 mt-2">AI Image Prompt (English)</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 p-2 rounded-md border">
                      {section.image_prompt}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {isEditing && (
            <div className="grid grid-cols-2 gap-4">
               <div>
                <h4 className="text-xs font-semibold text-slate-500 mb-1">Image Prompt</h4>
                <Input value={formData.image_prompt} onChange={e => setFormData({...formData, image_prompt: e.target.value})} className="text-sm h-9 sm:h-8" />
               </div>
               <div>
                <h4 className="text-xs font-semibold text-slate-500 mb-1">Target Images</h4>
                <Input type="number" min="1" max="20" value={formData.recommended_image_count} onChange={e => setFormData({...formData, recommended_image_count: parseInt(e.target.value) || 1})} className="text-sm h-9 sm:h-8" />
               </div>
               <div className="col-span-2">
                <h4 className="text-xs font-semibold text-slate-500 mb-1">Keywords</h4>
                <Input value={formData.keywords} onChange={e => setFormData({...formData, keywords: e.target.value})} placeholder="tag1, tag2..." className="text-sm h-9 sm:h-8" />
               </div>
            </div>
          )}

          {!isEditing && (
            <>
              <SectionMediaUploader 
                sectionId={section.id} 
                projectId={projectId} 
                recommendedCount={section.recommended_image_count} 
                canGenerateImage={canGenerateImage}
              />
              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/50 p-2 rounded-md border border-slate-200 dark:border-slate-700/50">
                <span className="font-semibold text-slate-600 dark:text-slate-300">🎬 Transition:</span>
                <span className="capitalize">{section.transition_type || 'fade'}</span>
                <span className="opacity-60">({section.transition_duration || 0.5}s)</span>
              </div>
            </>
          )}

          {isEditing && (
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                🎬 Transition Settings
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Type</label>
                  <select 
                    value={formData.transition_type} 
                    onChange={e => setFormData({...formData, transition_type: e.target.value})}
                    className="flex h-9 sm:h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="none">None</option>
                    <option value="fade">🎬 Fade</option>
                    <option value="cross_fade">⇆ Cross Fade</option>
                    <option value="dissolve">✨ Dissolve</option>
                    <option value="slide_left">⬅ Slide Left</option>
                    <option value="slide_right">➡ Slide Right</option>
                    <option value="slide_up">⬆ Slide Up</option>
                    <option value="slide_down">⬇ Slide Down</option>
                    <option value="zoom">🔍 Zoom</option>
                    <option value="blur">🌫 Blur Fade</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Duration</label>
                  <select 
                    value={formData.transition_duration} 
                    onChange={e => setFormData({...formData, transition_duration: parseFloat(e.target.value)})}
                    className="flex h-9 sm:h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="0.3">0.3s</option>
                    <option value="0.5">0.5s</option>
                    <option value="0.8">0.8s</option>
                    <option value="1.0">1.0s</option>
                    <option value="1.5">1.5s</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
        
        {/* Collapse Button (Mobile Only) */}
        <div className="pt-2 mt-4 border-t border-slate-100 dark:border-slate-800 xl:hidden">
          <Button 
            type="button"
            variant="outline" 
            className="w-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] transition-all duration-200"
            onClick={handleCollapse}
          >
            <ChevronUp className="h-4 w-4 mr-2" />
            Thu gọn Section
          </Button>
        </div>
      </CardContent>
      </Card>
    </div>
  )
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
