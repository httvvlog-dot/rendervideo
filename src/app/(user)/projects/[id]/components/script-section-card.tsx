"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Image as ImageIcon, Check, X, Edit2, AlertTriangle } from "lucide-react"
import { updateScriptSection } from "../script-actions"
import { toast } from "sonner"

export function ScriptSectionCard({ section, projectId, startTime }: { section: any, projectId: string, startTime: number }) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    title: section.title || "",
    narration: section.narration || "",
    visual_description: section.visual_description || "",
    image_prompt: section.image_prompt || "",
    recommended_image_count: section.recommended_image_count || 1,
    keywords: section.keywords ? section.keywords.join(", ") : ""
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

  return (
    <Card className="mb-4 overflow-hidden border-slate-200 dark:border-slate-800">
      <CardHeader className="bg-slate-50 dark:bg-slate-900/50 py-3 px-4 border-b flex flex-row items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Section {section.section_index}</span>
            <CardTitle className="text-base">{isEditing ? <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="h-7 text-sm mt-1" /> : (section.title || `Section ${section.section_index}`)}</CardTitle>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded border">
            {formatTime(startTime)} - {formatTime(startTime + section.duration_seconds)}
            <span className="ml-2 text-indigo-500 font-semibold">{section.duration_seconds}s</span>
          </div>
          {!isEditing ? (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}><Edit2 className="h-4 w-4" /></Button>
          ) : (
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}><X className="h-4 w-4 text-red-500" /></Button>
              <Button variant="ghost" size="sm" onClick={handleSave} disabled={isSaving}><Check className="h-4 w-4 text-green-500" /></Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                "{section.visual_description}"
              </p>
            )}
          </div>

          {isEditing && (
            <div className="grid grid-cols-2 gap-4">
               <div>
                <h4 className="text-xs font-semibold text-slate-500 mb-1">Image Prompt</h4>
                <Input value={formData.image_prompt} onChange={e => setFormData({...formData, image_prompt: e.target.value})} className="text-sm h-8" />
               </div>
               <div>
                <h4 className="text-xs font-semibold text-slate-500 mb-1">Target Images</h4>
                <Input type="number" min="1" max="20" value={formData.recommended_image_count} onChange={e => setFormData({...formData, recommended_image_count: parseInt(e.target.value) || 1})} className="text-sm h-8" />
               </div>
               <div className="col-span-2">
                <h4 className="text-xs font-semibold text-slate-500 mb-1">Keywords</h4>
                <Input value={formData.keywords} onChange={e => setFormData({...formData, keywords: e.target.value})} placeholder="tag1, tag2..." className="text-sm h-8" />
               </div>
            </div>
          )}

          {!isEditing && (
            <div className="bg-slate-100 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-md p-4 flex flex-col items-center justify-center text-center opacity-70">
              <ImageIcon className="h-6 w-6 text-slate-400 mb-2" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Requires ~{section.recommended_image_count} images
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Image upload coming in next phase</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
