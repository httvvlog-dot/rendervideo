import { Card, CardContent } from "@/components/ui/card"
import { Construction } from "lucide-react"

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Projects</h1>
        <p className="text-muted-foreground mt-1">View and manage all your AI video projects.</p>
      </div>

      <Card className="border-dashed border-2 bg-slate-50/50 dark:bg-slate-900/50">
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <Construction className="h-12 w-12 text-indigo-500 mb-4 opacity-50" />
          <h2 className="text-xl font-bold">Coming Soon</h2>
          <p className="text-muted-foreground mt-2 max-w-md">
            The full project management gallery is currently under construction. Please use the Dashboard to view your recent projects for now.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
