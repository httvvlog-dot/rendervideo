"use client" // Error components must be Client Components

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-4">
      <AlertCircle className="h-10 w-10 text-red-500" />
      <h2 className="text-xl font-bold">Something went wrong!</h2>
      <p className="text-muted-foreground max-w-md text-center">{error.message || "An unexpected error occurred."}</p>
      <Button onClick={() => reset()} variant="outline">
        Try again
      </Button>
    </div>
  )
}
