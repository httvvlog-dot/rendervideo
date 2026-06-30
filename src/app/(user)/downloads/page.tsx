import { Card, CardContent } from "@/components/ui/card"
import { Construction } from "lucide-react"

export default function DownloadsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Downloads</h1>
        <p className="text-muted-foreground mt-1">Manage and download your completed AI videos.</p>
      </div>

      <Card className="border-dashed border-2 bg-slate-50/50 dark:bg-slate-900/50">
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <Construction className="h-12 w-12 text-indigo-500 mb-4 opacity-50" />
          <h2 className="text-xl font-bold">Coming Soon</h2>
          <p className="text-muted-foreground mt-2 max-w-md">
            The downloads management feature is currently under construction. Once your videos are rendered, they will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
