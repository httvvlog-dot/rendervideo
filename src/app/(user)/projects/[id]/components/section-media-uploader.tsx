"use client"

import { useState, useEffect, useRef } from "react"
import { getSectionImages, uploadProjectMedia, deleteProjectMedia } from "../media-actions"
import { generateAIImageStub, saveAIImage } from "../image-actions"
import { toast } from "sonner"
import { UploadCloud, X, Loader2, Image as ImageIcon, Trash2, Sparkles, Download, Maximize2, Plus } from "lucide-react"

export function SectionMediaUploader({ sectionId, projectId, recommendedCount }: { sectionId: string, projectId: string, recommendedCount: number }) {
  const [media, setMedia] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [primaryIndex, setPrimaryIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState("Image")
  
  // AI Gen state
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiPreviewUrl, setAiPreviewUrl] = useState<string | null>(null)
  const [isSavingAI, setIsSavingAI] = useState(false)

  useEffect(() => {
    loadMedia()
  }, [sectionId])

  async function loadMedia() {
    try {
      setIsLoading(true)
      const data = await getSectionImages(sectionId)
      setMedia(data || [])
      setPrimaryIndex(0)
    } catch (err: any) {
      toast.error("Failed to load section media")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUploadClick = () => {
    if (fileInputRef.current) fileInputRef.current.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    const toastId = toast.loading(`Uploading image...`)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append("file", file)
        const res = await uploadProjectMedia(projectId, formData, sectionId)
        if (res.error) throw new Error(res.error)
      }
      toast.success("Upload complete", { id: toastId })
      await loadMedia()
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDelete = async (mediaId: string) => {
    if (!confirm("Permanently delete this image?")) return
    const toastId = toast.loading("Deleting...")
    try {
      await deleteProjectMedia(mediaId, projectId)
      const newMedia = media.filter(m => m.id !== mediaId)
      setMedia(newMedia)
      if (primaryIndex >= newMedia.length) setPrimaryIndex(Math.max(0, newMedia.length - 1))
      toast.success("Deleted", { id: toastId })
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    }
  }
  
  const handleGenerateAI = async () => {
    setIsGenerating(true)
    setAiPreviewUrl(null)
    const toastId = toast.loading("Generating AI image...")
    try {
      const res = await generateAIImageStub(projectId, sectionId, "Generate image")
      if ('error' in res) throw new Error((res as any).error || "No URL returned")
      const data = res as { url: string; width: number; height: number; }
      if (!data.url) throw new Error("No URL returned")
      setAiPreviewUrl(data.url)
      toast.dismiss(toastId)
    } catch (err: any) {
      toast.error(err.message || "Failed to generate AI image", { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }
  
  const handleAcceptAI = async () => {
    if (!aiPreviewUrl) return
    setIsSavingAI(true)
    const toastId = toast.loading("Saving image...")
    try {
      const res = await saveAIImage(projectId, sectionId, aiPreviewUrl, "AI Image")
      if (res.error) throw new Error(res.error)
      setAiPreviewUrl(null)
      toast.success("Image saved", { id: toastId })
      await loadMedia()
    } catch (err: any) {
      toast.error(err.message || "Failed to save AI image", { id: toastId })
    } finally {
      setIsSavingAI(false)
    }
  }
  
  const handleDownload = (url: string) => {
    window.open(url, "_blank")
  }
  
  const handleFullscreen = (url: string) => {
    window.open(url, "_blank")
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[320px]">
      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/50">
        {["Image", "Video", "Audio", "Subtitle"].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab 
                ? "text-indigo-400 border-b-2 border-indigo-500 bg-slate-900" 
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="flex-1 p-3 flex flex-col relative bg-slate-900/50 overflow-y-auto">
        
        {/* Only implemented Image Tab for now */}
        {activeTab !== "Image" ? (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
            {activeTab} support coming soon
          </div>
        ) : (
          <>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              multiple 
              className="hidden" 
            />
            
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
            ) : aiPreviewUrl ? (
              <div className="flex-1 flex flex-col gap-3">
                 <div className="flex-1 relative rounded-lg overflow-hidden bg-black/50 border border-indigo-500/30 flex items-center justify-center">
                    <img src={aiPreviewUrl} alt="AI Preview" className="max-w-full max-h-full object-contain" />
                    <div className="absolute top-2 left-2 bg-indigo-500 text-white text-xs px-2 py-1 rounded-md font-medium shadow-md">
                      Preview
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={handleGenerateAI}
                      disabled={isGenerating || isSavingAI}
                      className="flex-1 py-2 px-3 text-sm bg-slate-800 hover:bg-slate-700 text-white rounded-md border border-slate-700 transition-colors disabled:opacity-50"
                    >
                      Regenerate
                    </button>
                    <button 
                      onClick={handleAcceptAI}
                      disabled={isSavingAI}
                      className="flex-1 py-2 px-3 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors disabled:opacity-50"
                    >
                      {isSavingAI ? "Saving..." : "Accept"}
                    </button>
                    <button 
                      onClick={() => setAiPreviewUrl(null)}
                      disabled={isSavingAI}
                      className="py-2 px-3 text-sm bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-md border border-slate-700 transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                 </div>
              </div>
            ) : media.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-950/30 rounded-lg border border-dashed border-slate-700/50 m-2 group hover:border-slate-600 transition-colors">
                <div className="text-4xl mb-3 opacity-80 group-hover:opacity-100 transition-opacity">🖼️</div>
                <div className="text-sm font-medium text-slate-400 mb-6">No Image Yet</div>
                <div className="flex flex-col gap-2 w-full max-w-[200px]">
                  <button 
                    onClick={handleGenerateAI}
                    disabled={isGenerating || isUploading}
                    className="flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-md border border-indigo-500/30 transition-all text-sm font-medium disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Generate AI Image
                  </button>
                  <button 
                    onClick={handleUploadClick}
                    disabled={isGenerating || isUploading}
                    className="flex items-center justify-center gap-2 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md border border-slate-700 transition-all text-sm font-medium disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    Upload Image
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full gap-2">
                {/* Primary Preview */}
                <div className="flex-1 relative rounded-lg overflow-hidden bg-black/40 border border-slate-800 group flex items-center justify-center min-h-0">
                  <img 
                    src={media[primaryIndex]?.public_url} 
                    alt="Primary" 
                    className="max-w-full max-h-full object-contain" 
                  />
                  
                  {/* Actions Overlay */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 backdrop-blur-md p-1 rounded-lg border border-slate-700/50 shadow-xl">
                    <button 
                      title="Download"
                      onClick={() => handleDownload(media[primaryIndex]?.public_url)}
                      className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      title="Fullscreen"
                      onClick={() => handleFullscreen(media[primaryIndex]?.public_url)}
                      className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition-colors"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      title="Generate More"
                      onClick={handleGenerateAI}
                      className="p-1.5 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-md transition-colors ml-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      title="Replace/Upload"
                      onClick={handleUploadClick}
                      className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition-colors"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      title="Delete"
                      onClick={() => handleDelete(media[primaryIndex]?.id)}
                      className="p-1.5 hover:bg-red-600 text-red-400 hover:text-white rounded-md transition-colors ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                {/* Thumbnail Strip */}
                <div className="h-14 flex-shrink-0 flex items-center gap-2 overflow-x-auto pb-1 px-1 custom-scrollbar">
                  {media.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => setPrimaryIndex(idx)}
                      className={`relative flex-shrink-0 w-20 h-full rounded-md overflow-hidden border-2 transition-all ${
                        idx === primaryIndex ? "border-indigo-500 shadow-md" : "border-slate-800 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={item.public_url} alt="thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                  
                  <button 
                    onClick={handleUploadClick}
                    className="flex-shrink-0 w-12 h-full rounded-md border-2 border-dashed border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-500 hover:text-slate-300 flex items-center justify-center transition-colors"
                    title="Add Image"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
