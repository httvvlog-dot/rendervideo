"use client"

import { useState, useEffect, useRef } from "react"
import { getSectionImages, uploadProjectMedia, unassignMediaFromSection, deleteProjectMedia, assignMediaToSection } from "../media-actions"
import { toast } from "sonner"
import { UploadCloud, X, Loader2, Image as ImageIcon, Trash2 } from "lucide-react"

export function SectionMediaUploader({ sectionId, projectId, recommendedCount }: { sectionId: string, projectId: string, recommendedCount: number }) {
  const [media, setMedia] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadMedia()
  }, [sectionId])

  async function loadMedia() {
    try {
      setIsLoading(true)
      const data = await getSectionImages(sectionId)
      setMedia(data || [])
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
    const toastId = toast.loading(`Uploading ${files.length} image(s)...`)

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

  const handleUnassign = async (mediaId: string) => {
    try {
      await unassignMediaFromSection(mediaId, projectId)
      setMedia(media.filter(m => m.id !== mediaId))
    } catch (err: any) {
      toast.error("Failed to unassign: " + err.message)
    }
  }

  const handleDelete = async (mediaId: string) => {
    if (!confirm("Permanently delete this image?")) return
    const toastId = toast.loading("Deleting...")
    try {
      await deleteProjectMedia(mediaId, projectId)
      setMedia(media.filter(m => m.id !== mediaId))
      toast.success("Deleted", { id: toastId })
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Section Media
          <span className="ml-2 text-xs font-normal text-slate-500">
            ({media.length}/{recommendedCount} recommended)
          </span>
        </h4>
        <button 
          onClick={handleUploadClick} 
          disabled={isUploading}
          className="text-xs flex items-center text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <UploadCloud className="h-3 w-3 mr-1" />}
          Upload
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          multiple 
          className="hidden" 
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
      ) : media.length === 0 ? (
        <div 
          onClick={handleUploadClick}
          className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-md p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 transition-colors"
        >
          <ImageIcon className="h-8 w-8 text-slate-400 mb-2" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Drag & drop or click to upload
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Target: {recommendedCount} images
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {media.map((item) => (
            <div key={item.id} className="relative group rounded-md overflow-hidden bg-black aspect-video border border-slate-200 dark:border-slate-800">
              <img 
                src={item.public_url} 
                alt={item.file_name} 
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button 
                  title="Unassign"
                  onClick={() => handleUnassign(item.id)} 
                  className="p-1.5 bg-white/10 hover:bg-white/30 rounded-full backdrop-blur-sm text-white"
                >
                  <X className="h-4 w-4" />
                </button>
                <button 
                  title="Delete"
                  onClick={() => handleDelete(item.id)} 
                  className="p-1.5 bg-red-500/80 hover:bg-red-600 rounded-full backdrop-blur-sm text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {isUploading && (
            <div className="relative rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-video flex items-center justify-center border border-slate-200 dark:border-slate-700">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
