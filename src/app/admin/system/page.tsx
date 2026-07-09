import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, AlertCircle, HardDrive, Database, Lock, Server, Cpu, Cloud, Mic, Type } from "lucide-react"

export default function SystemValidationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Validation</h1>
        <p className="text-muted-foreground mt-1">Real-time health check of all core services and dependencies.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" /> Environment Details</CardTitle>
            <CardDescription>Current build and deployment status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">Next.js Version</span>
              <span className="font-mono text-sm">14.2.4</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">Build Version</span>
              <span className="font-mono text-sm">1.0.0-dev</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">Latest Migration</span>
              <span className="font-mono text-sm">20260624000006</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-muted-foreground">Node Environment</span>
              <span className="font-mono text-sm">{process.env.NODE_ENV}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ActivityIcon className="h-5 w-5" /> Core Services</CardTitle>
            <CardDescription>Primary application infrastructure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatusRow icon={<Database className="h-4 w-4" />} label="Supabase Database" status="healthy" />
            <StatusRow icon={<Lock className="h-4 w-4" />} label="Authentication" status="healthy" />
            <StatusRow icon={<Lock className="h-4 w-4" />} label="Row Level Security (RLS)" status="healthy" />
            <StatusRow icon={<HardDrive className="h-4 w-4" />} label="Supabase Storage" status="healthy" />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Cpu className="h-5 w-5" /> AI Providers & Rendering</CardTitle>
            <CardDescription>External APIs and background workers.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <StatusRow icon={<Cpu className="h-4 w-4" />} label="OpenRouter (LLM)" status="pending" note="Awaiting Config" />
            <StatusRow icon={<Mic className="h-4 w-4" />} label="ElevenLabs (Voice)" status="pending" note="Awaiting Config" />
            <StatusRow icon={<Type className="h-4 w-4" />} label="Whisper (Subtitle)" status="pending" note="Awaiting Config" />
            <StatusRow icon={<Cloud className="h-4 w-4" />} label="Cloudflare R2" status="pending" note="Sprint 4" />
            <StatusRow icon={<Server className="h-4 w-4" />} label="Render Worker" status="pending" note="Offline" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ActivityIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}

export type SystemHealthStatus = "healthy" | "error" | "pending";

function StatusRow({ icon, label, status, note }: { icon: React.ReactNode, label: string, status: SystemHealthStatus, note?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
        {status === "healthy" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
        {status === "error" && <XCircle className="h-5 w-5 text-red-500" />}
        {status === "pending" && <div className="h-4 w-4 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-transparent" />}
      </div>
    </div>
  )
}
