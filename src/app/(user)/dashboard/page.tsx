import { getCurrentUser } from "@/utils/auth-service"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Video, Clock } from "lucide-react"
import Link from "next/link"

export default async function UserDashboard() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.full_name || user.email.split("@")[0]}</h1>
          <p className="text-muted-foreground mt-1">Ready to create some amazing videos?</p>
        </div>
        <div className="flex gap-2">
          <Link href="/projects/new">
            <Button size="lg" className="font-semibold">
              <Plus className="mr-2 h-5 w-5" />
              Create First Project
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">You haven't created any projects yet.</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Minutes Generated</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0m</div>
            <p className="text-xs text-muted-foreground">0% of your monthly quota</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold tracking-tight mb-4">Recent Projects</h2>
        <Card className="border-dashed bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <Video className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">No projects found</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              You don't have any video projects yet. Click the button below to start your first creation.
            </p>
            <Link href="/projects/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
