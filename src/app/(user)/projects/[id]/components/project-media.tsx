"use client"

import { useState } from "react"
import { uploadProjectMedia, deleteProjectMedia } from "../media-actions"
import { toast } from "sonner"
import { Loader2, Trash2, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ProjectMedia({ projectId, initialMedia }: { projectId: string, initialMedia: any[] }) {
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

    setIsUploading(false)
    e.target.value = '' // reset input
    
    if (uploadCount > 0) {
      toast.success(`Successfully uploaded ${uploadCount} image(s)`)
    }
  }

  const handleDelete = async (mediaId: string) => {
    setDeletingId(mediaId)
    const res = await deleteProjectMedia(mediaId, projectId)
    setDeletingId(null)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Image deleted")
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm mt-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center">
          <ImageIcon className="w-5 h-5 mr-2 text-slate-500" />
          Project Media
        </h2>
        <div className="relative">
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            onChange={handleFileChange} 
            disabled={isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <Button disabled={isUploading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> : "Upload Images"}
          </Button>
        </div>
      </div>

      {initialMedia.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-500">
          <ImageIcon className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
          <p>No media uploaded yet.</p>
          <p className="text-sm mt-1">Click "Upload Images" to add files.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {initialMedia.map((media) => (
            <div key={media.id} className="group relative border rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={media.public_url} 
                alt={media.file_name}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                <div className="flex justify-end">
                  <button 
                    onClick={() => handleDelete(media.id)}
                    disabled={deletingId === media.id}
                    className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50"
                  >
                    {deletingId === media.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
                <div>
                  <p className="text-white text-xs font-medium truncate" title={media.file_name}>
                    {media.file_name}
                  </p>
                  <p className="text-slate-300 text-[10px]">
                    {(media.file_size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
