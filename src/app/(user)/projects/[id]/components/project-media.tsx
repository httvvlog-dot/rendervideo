"use client"

import { useState } from "react"
import { uploadProjectMedia, deleteProjectMedia } from "../media-actions"
import { toast } from "sonner"
import { Loader2, Trash2, Image as ImageIcon, Video, Music, Mic, Type, Layers, Box } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function ProjectMedia({ projectId, initialMedia, targetDuration }: { projectId: string, initialMedia: any[], targetDuration: number }) {
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("Images")
  const router = useRouter()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    setIsUploading(true)
    let uploadCount = 0
    let failCount = 0

    // Upload files sequentially for simplicity and reliability
    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i]
      const formData = new FormData()
      formData.append("file", file)

      try {
        const res = await uploadProjectMedia(projectId, formData)
        if (res.error) {
          toast.error(`Failed to upload ${file.name}: ${res.error}`)
          failCount++
        } else {
          uploadCount++
        }
      } catch (err: any) {
        toast.error(`Error uploading ${file.name}: ${err.message}`)
        failCount++
      }
    }

    e.target.value = '' // reset input
    
    if (uploadCount > 0) {
      toast.success(`Successfully uploaded ${uploadCount} image(s)`)
      router.refresh()
    }

    setIsUploading(false)
  }

  const handleDelete = async (mediaId: string) => {
    setDeletingId(mediaId)
    const res = await deleteProjectMedia(mediaId, projectId)
    setDeletingId(null)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Image deleted")
      router.refresh()
    }
  }

  const tabs = [
    { id: "Images", icon: <ImageIcon className="w-4 h-4 mr-2" />, enabled: true },
    { id: "Videos", icon: <Video className="w-4 h-4 mr-2" />, enabled: false },
    { id: "Audio", icon: <Mic className="w-4 h-4 mr-2" />, enabled: false },
    { id: "Music", icon: <Music className="w-4 h-4 mr-2" />, enabled: false },
    { id: "Logo", icon: <Box className="w-4 h-4 mr-2" />, enabled: false },
    { id: "Overlay", icon: <Layers className="w-4 h-4 mr-2" />, enabled: false },
    { id: "Subtitle", icon: <Type className="w-4 h-4 mr-2" />, enabled: false },
  ]

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-xl shadow-sm overflow-hidden">
      
      <div className="border-b bg-slate-50 dark:bg-slate-900/50 p-2 flex overflow-x-auto hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => tab.enabled && setActiveTab(tab.id)}
            disabled={!tab.enabled}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap
              ${activeTab === tab.id 
                ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm border" 
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }
              ${!tab.enabled && "opacity-50 cursor-not-allowed"}
            `}
          >
            {tab.icon} {tab.id}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Canva-style Upload Zone */}
        <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl p-10 text-center transition-colors">
          <input 
            type="file" 
            multiple 
            accept="image/png, image/jpeg, image/webp" 
            onChange={handleFileChange} 
            disabled={isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
          />
          <div className="flex flex-col items-center justify-center pointer-events-none">
            {isUploading ? (
              <>
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Uploading & Processing...</h3>
                <p className="text-sm text-slate-500 mt-1">Please wait while assets are imported into the timeline.</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-white dark:bg-slate-800 shadow-sm rounded-full flex items-center justify-center mb-4">
                  <ImageIcon className="w-8 h-8 text-indigo-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Drag and drop images here, or <span className="text-indigo-600 underline">Browse</span>
                </h3>
                <p className="text-sm text-slate-500 mt-2">Supports PNG, JPG, WEBP. Maximum 100 images per batch.</p>
              </>
            )}
          </div>
        </div>

        {/* Media Library Grid */}
        {initialMedia.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Project Assets ({initialMedia.length})</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-3">
              {initialMedia.map((media) => (
                <div key={media.id} className="group relative border rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={media.public_url} 
                    alt={media.file_name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                    <div className="flex justify-end">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(media.id); }}
                        disabled={deletingId === media.id}
                        className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50"
                      >
                        {deletingId === media.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
    </div>
  )
}

