"use client"

import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { deleteProject } from "@/app/(user)/projects/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isDeleting) return
    
    if (!window.confirm("Are you sure you want to delete this project?")) return

    setIsDeleting(true)
    const toastId = toast.loading("Deleting project...")
    try {
      await deleteProject(projectId)
      toast.success("Project deleted", { id: toastId })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete project", { id: toastId })
      setIsDeleting(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 sm:h-8 sm:w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full shrink-0 disabled:opacity-50 transition-colors"
      onClick={handleDelete}
      disabled={isDeleting}
      title="Delete project"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
