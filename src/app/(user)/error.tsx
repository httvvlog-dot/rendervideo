"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex h-[50vh] flex-col items-center justify-center space-y-4 text-center">
      <h2 className="text-2xl font-bold tracking-tight">Something went wrong!</h2>
      <p className="text-slate-500 dark:text-slate-400 max-w-md">
        An unexpected error occurred while loading this page. We've been notified.
      </p>
      <Button onClick={() => reset()} variant="default">
        Try again
      </Button>
    </div>
  )
}
