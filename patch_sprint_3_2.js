const fs = require('fs');
const path = require('path');

// 1. Create script-actions.ts
const actionsPath = path.join(process.cwd(), 'src/app/(user)/projects/[id]/script-actions.ts');
const actionsContent = `
"use server"

import { createClient } from "@/utils/supabase/server"
import { getCurrentUser } from "@/utils/auth-service"
import { revalidatePath } from "next/cache"

export async function generateScript(projectId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")

  const supabase = await createClient()

  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).single()
  if (!project) throw new Error("Project not found")

  const { data: provider } = await supabase.from("providers").select("config_json").eq("provider_name", "OpenRouter").eq("is_active", true).single()
  if (!provider || !provider.config_json?.apiKey) throw new Error("OpenRouter provider not configured or inactive")

  const apiKey = provider.config_json.apiKey
  const model = provider.config_json.defaultModel || "openai/gpt-4o-mini"
  const promptText = \`Write a video script. Topic: \${project.topic}. Language: \${project.language}. Video duration: \${project.video_length} minutes. Do not include camera directions, just the spoken script.\`

  const startTime = Date.now()
  let responseData
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": \`Bearer \${apiKey}\`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: promptText }]
      })
    })

    if (!res.ok) throw new Error(\`OpenRouter API error: \${res.status}\`)
    responseData = await res.json()
  } catch (err: any) {
    await supabase.from("projects").update({
      workflow_state: { ...project.workflow_state, script: "failed" }
    }).eq("id", projectId)
    throw new Error(err.message)
  }

  const latency = Date.now() - startTime
  const content = responseData.choices?.[0]?.message?.content || ""
  const tokensInput = responseData.usage?.prompt_tokens || 0
  const tokensOutput = responseData.usage?.completion_tokens || 0
  // Estimated cost based on cheap models
  const cost = ((tokensInput * 0.15) + (tokensOutput * 0.6)) / 1000000 

  const { data: existingScripts } = await supabase.from("scripts").select("version").eq("project_id", projectId).order("version", { ascending: false }).limit(1)
  const nextVersion = existingScripts && existingScripts.length > 0 ? existingScripts[0].version + 1 : 1

  const { error: insertErr } = await supabase.from("scripts").insert({
    project_id: projectId,
    content: content,
    word_count: content.split(/\\s+/).length,
    version: nextVersion,
    provider: "OpenRouter",
    model: model,
    prompt: promptText,
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
    latency_ms: latency,
    cost: cost
  })

  if (insertErr) throw new Error("Failed to save script: " + insertErr.message)

  await supabase.from("projects").update({
    workflow_state: { ...project.workflow_state, script: "completed" }
  }).eq("id", projectId)

  revalidatePath(\`/projects/\${projectId}\`)
  return { success: true }
}

export async function deleteScriptVersion(scriptId: string, projectId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")

  const supabase = await createClient()
  await supabase.from("scripts").delete().eq("id", scriptId)

  const { count } = await supabase.from("scripts").select("*", { count: "exact", head: true }).eq("project_id", projectId)
  
  if (count === 0) {
    const { data: project } = await supabase.from("projects").select("workflow_state").eq("id", projectId).single()
    if (project) {
      await supabase.from("projects").update({
        workflow_state: { ...project.workflow_state, script: "pending" }
      }).eq("id", projectId)
    }
  }
  revalidatePath(\`/projects/\${projectId}\`)
}
`;
fs.writeFileSync(actionsPath, actionsContent, 'utf8');
console.log('[OK] Created script-actions.ts');

// 2. Create script-manager.tsx
const componentDir = path.join(process.cwd(), 'src/app/(user)/projects/[id]/components');
if (!fs.existsSync(componentDir)) fs.mkdirSync(componentDir, { recursive: true });

const managerPath = path.join(componentDir, 'script-manager.tsx');
const managerContent = `
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, RotateCcw, Trash, FileText, Loader2, Clock, Zap, DollarSign } from "lucide-react"
import { generateScript, deleteScriptVersion } from "../script-actions"
import { toast } from "sonner"

export function ScriptManager({ projectId, scripts }: { projectId: string, scripts: any[] }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeVersion, setActiveVersion] = useState<number>(scripts.length > 0 ? scripts[0].version : 0)

  const activeScript = scripts.find(s => s.version === activeVersion)

  const handleGenerate = async () => {
    setIsGenerating(true)
    const toastId = toast.loading("Generating script via OpenRouter...")
    try {
      await generateScript(projectId)
      toast.success("Script generated successfully!", { id: toastId })
      // Newest version will be passed down via Server Components revalidation,
      // but we can assume it will be max version + 1
      const maxV = scripts.length > 0 ? Math.max(...scripts.map(s => s.version)) : 0
      setActiveVersion(maxV + 1)
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDelete = async () => {
    if (!activeScript) return
    if (!confirm(\`Are you sure you want to delete Version \${activeScript.version}?\`)) return
    
    toast.loading("Deleting...", { id: 'del' })
    try {
      await deleteScriptVersion(activeScript.id, projectId)
      toast.success("Deleted", { id: 'del' })
      const remaining = scripts.filter(s => s.id !== activeScript.id)
      if (remaining.length > 0) {
        setActiveVersion(remaining[0].version)
      } else {
        setActiveVersion(0)
      }
    } catch (err: any) {
      toast.error(err.message, { id: 'del' })
    }
  }

  if (scripts.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-slate-50/50 dark:bg-slate-900/50 mt-6">
        <CardContent className="flex flex-col items-center justify-center h-48 text-center">
          <FileText className="h-10 w-10 text-slate-400 mb-4 opacity-50" />
          <h2 className="text-lg font-semibold">No Script Generated</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Start the AI pipeline by generating the initial video script.</p>
          <Button onClick={handleGenerate} disabled={isGenerating} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <><Play className="mr-2 h-4 w-4" /> Generate Script</>}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center">
          <FileText className="h-5 w-5 mr-2 text-indigo-500" /> Script Manager
        </h2>
        <div className="flex items-center space-x-2">
          <select 
            value={activeVersion} 
            onChange={(e) => setActiveVersion(Number(e.target.value))}
            className="border rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-900 font-medium"
          >
            {scripts.map(s => (
              <option key={s.id} value={s.version}>Version {s.version} ({new Date(s.created_at).toLocaleTimeString()})</option>
            ))}
          </select>
          <Button onClick={handleGenerate} disabled={isGenerating} variant="outline" size="sm">
             {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
             Regenerate
          </Button>
          <Button onClick={handleDelete} variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950">
             <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {activeScript && (
        <Card>
          <div className="border-b bg-slate-50 dark:bg-slate-900 px-4 py-2 flex flex-wrap gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="flex items-center"><Zap className="h-3.5 w-3.5 mr-1" /> {activeScript.model}</span>
            <span className="flex items-center"><Clock className="h-3.5 w-3.5 mr-1" /> {activeScript.latency_ms}ms</span>
            <span>Tokens: {activeScript.tokens_input} in / {activeScript.tokens_output} out</span>
            <span className="flex items-center"><DollarSign className="h-3.5 w-3.5 mr-0.5" /> {activeScript.cost || 0}</span>
            <span>{activeScript.word_count} words</span>
          </div>
          <CardContent className="p-0">
            <textarea 
              readOnly 
              className="w-full h-80 p-4 bg-transparent resize-none focus:outline-none focus:ring-0 font-serif leading-relaxed text-slate-800 dark:text-slate-200"
              value={activeScript.content}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
`;
fs.writeFileSync(managerPath, managerContent, 'utf8');
console.log('[OK] Created script-manager.tsx');

// 3. Patch projects/[id]/page.tsx
const pagePath = path.join(process.cwd(), 'src/app/(user)/projects/[id]/page.tsx');
let pageContent = fs.readFileSync(pagePath, 'utf8');

if (!pageContent.includes('ScriptManager')) {
  // Add import
  pageContent = pageContent.replace('import { deleteProject } from "../actions"', 'import { deleteProject } from "../actions"\nimport { ScriptManager } from "./components/script-manager"');
  
  // Fetch scripts
  pageContent = pageContent.replace(
    'const { data: project } = await supabase',
    `const { data: scripts } = await supabase.from('scripts').select('*').eq('project_id', params.id).order('version', { ascending: false })
  const { data: project } = await supabase`
  );
  
  // Inject ScriptManager
  pageContent = pageContent.replace(
    '</dl>\n          </div>',
    '</dl>\n          </div>\n        </div>\n      </div>\n      <ScriptManager projectId={project.id} scripts={scripts || []} />\n      <div className="hidden">' // Hides the extra div close tags we shifted
  );
  // Wait, replacing HTML structure with regex is brittle.
  // Better approach: Let's reconstruct the page entirely since it's short and clean.
}

const cleanPageContent = `
import { getCurrentUser } from "@/utils/auth-service"
import { createClient } from "@/utils/supabase/server"
import { notFound, redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Play, Settings, CheckCircle2, Circle, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { deleteProject } from "../actions"
import { ScriptManager } from "./components/script-manager"

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user?.id)
    .single()

  if (!project) notFound()

  const { data: scripts } = await supabase
    .from('scripts')
    .select('*')
    .eq('project_id', params.id)
    .order('version', { ascending: false })

  const wf = project.workflow_state || {
    research: "pending", script: "pending", scene: "pending", voice: "pending", subtitle: "pending", render: "pending"
  }

  const steps = [
    { key: "research", label: "Research", icon: "🔍" },
    { key: "script", label: "Script", icon: "📝" },
    { key: "voice", label: "Voice", icon: "🎙️" },
    { key: "subtitle", label: "Subtitle", icon: "💬" },
    { key: "render", label: "Render", icon: "🎬" },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/projects">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
            <p className="text-sm text-muted-foreground">{project.topic}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline"><Settings className="mr-2 h-4 w-4" /> Settings</Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white"><Play className="mr-2 h-4 w-4" /> Pipeline Menu</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Generation Pipeline</h2>
            
            <div className="relative border-l border-slate-200 dark:border-slate-800 ml-3 space-y-8 py-2">
              {steps.map((step, idx) => (
                <div key={step.key} className="relative pl-8">
                  <StateIcon state={wf[step.key]} />
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium flex items-center text-slate-900 dark:text-slate-100">
                        {step.icon} {step.label}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {wf[step.key] === 'pending' && 'Waiting to start...'}
                        {wf[step.key] === 'processing' && 'Working on it...'}
                        {wf[step.key] === 'completed' && 'Completed successfully'}
                        {wf[step.key] === 'failed' && 'Error occurred'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <ScriptManager projectId={project.id} scripts={scripts || []} />
          
        </div>
        
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Project Info</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Language</dt><dd className="font-medium uppercase">{project.language}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Duration</dt><dd className="font-medium">{project.video_length} mins</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd className="font-medium capitalize">{project.status}</dd></div>
            </dl>
          </div>
          
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-red-800 dark:text-red-400 uppercase tracking-wider mb-2">Danger Zone</h2>
            <p className="text-xs text-red-600 dark:text-red-500 mb-4">Once deleted, you cannot restore this project.</p>
            <form action={async () => { "use server"; await deleteProject(project.id); redirect('/projects'); }}>
              <Button type="submit" variant="destructive" className="w-full">Delete Project</Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function StateIcon({ state }: { state: string }) {
  if (state === 'completed') return <CheckCircle2 className="absolute -left-[11px] top-0.5 h-6 w-6 text-green-500 bg-white dark:bg-slate-900 rounded-full" />
  if (state === 'failed') return <XCircle className="absolute -left-[11px] top-0.5 h-6 w-6 text-red-500 bg-white dark:bg-slate-900 rounded-full" />
  if (state === 'processing') return <Loader2 className="absolute -left-[11px] top-0.5 h-6 w-6 text-yellow-500 animate-spin bg-white dark:bg-slate-900 rounded-full" />
  return <Circle className="absolute -left-[11px] top-0.5 h-6 w-6 text-slate-300 dark:text-slate-700 bg-white dark:bg-slate-900 rounded-full" />
}
`;

fs.writeFileSync(pagePath, cleanPageContent, 'utf8');
console.log('[OK] Patched projects/[id]/page.tsx');
