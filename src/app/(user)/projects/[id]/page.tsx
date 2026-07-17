import { getCurrentUser } from "@/utils/auth-service"
import { createClient } from "@/utils/supabase/server"
import { notFound, redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Settings, Save } from "lucide-react"
import Link from "next/link"
import { deleteProject } from "../actions"
import { TimelineEditor } from "./components/timeline-editor"
import { ProjectMedia } from "./components/project-media"
import { ScriptManager } from "./components/script-manager"
import { TimelineGeneratorButton } from "./components/timeline-generator-button"
import { VoiceGeneratorButtons } from "./components/voice-generator-buttons"

import { VoiceSelector } from "./components/voice-selector"

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser()
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_voice_preset_id')
    .eq('id', user?.id)
    .single()

  const { data: activeVoices } = await supabase
    .from('voice_presets')
    .select('id, display_name, description, category, preview_url, voice_id')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user?.id)
    .single()

  if (!project) notFound()

  const { data: scripts } = await supabase
    .from('scripts')
    .select('*')
    .eq('project_id', id)
    .order('version', { ascending: true })

  const { data: scenes } = await supabase
    .from('project_scenes')
    .select('*')
    .eq('project_id', id)
    .order('sort_order', { ascending: true })

  const { data: projectMediaRaw } = await supabase
    .from('project_media')
    .select('*')
    .eq('project_id', id)
    .in('asset_type', ['image', 'voice'])
    .order('created_at', { ascending: false })

  const projectMedia = projectMediaRaw?.filter(m => m.asset_type === 'image') || [];
  const voiceMedia = projectMediaRaw?.filter(m => m.asset_type === 'voice') || [];

  const hasExistingScenes = scenes !== null && scenes.length > 0;
  const activeScript = scripts?.find(s => s.id === project.active_script_id);
  
  let activeSections: any[] = [];
  if (activeScript) {
    const { data: fetchedSections } = await supabase
      .from('script_sections')
      .select('*')
      .eq('script_id', activeScript.id)
      .order('section_index', { ascending: true });
    activeSections = fetchedSections || [];
  }

  const hasAnySections = activeSections.length > 0;
  const allVoicesGenerated = hasAnySections && activeSections.every(s => s.voice_media_id != null);
  const hasVoicePending = hasAnySections && !allVoicesGenerated;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20 mt-6 px-4">
      {/* 1. Project Settings Panel (Sticky Header) */}
      <div className="bg-slate-900 text-slate-100 rounded-xl shadow-lg border border-slate-800 p-4 sticky top-4 z-50 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/projects" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold tracking-tight">{project.title}</h1>
            <div className="flex items-center space-x-4 text-xs text-slate-400 mt-1 font-mono">
              <span>Duration: {project.video_length}s</span>
              <span>•</span>
              <span>Aspect: 9:16</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary" size="sm" className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700">
            <Settings className="w-4 h-4 mr-2" /> Format
          </Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Save className="w-4 h-4 mr-2" /> Save Draft
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Main Workspace (Assets + Timeline) */}
        <div className="xl:col-span-3 space-y-6">
          
          <ScriptManager projectId={project.id} scripts={scripts || []} project={project} />
          
          {/* Global Media Assets (for non-section specific logic) */}
          <ProjectMedia projectId={project.id} initialMedia={projectMedia || []} targetDuration={project.video_length} />
          
          {/* Timeline Generation & Editor */}
          <div className="mt-8">
            <div className="flex flex-col mb-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Timeline Editor</h2>
                <div className="flex items-center space-x-2">
                  <VoiceSelector voices={activeVoices || []} defaultVoiceId={profile?.default_voice_preset_id} />
                  <VoiceGeneratorButtons 
                    projectId={project.id} 
                    allVoicesGenerated={allVoicesGenerated} 
                    hasAnySections={hasAnySections}
                  />
                  <TimelineGeneratorButton 
                    projectId={project.id} 
                    hasExistingScenes={hasExistingScenes} 
                    allVoicesGenerated={allVoicesGenerated}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-md border">
                <span className="font-bold text-slate-700 dark:text-slate-300">Workflow:</span>
                <span className={!allVoicesGenerated ? "text-blue-600 dark:text-blue-400 font-bold" : ""}>Step 1: Generate Voice</span>
                <span>→</span>
                <span className={allVoicesGenerated && !hasExistingScenes ? "text-blue-600 dark:text-blue-400 font-bold" : ""}>Step 2: Sync Timeline</span>
                <span>→</span>
                <span className={allVoicesGenerated && hasExistingScenes ? "text-blue-600 dark:text-blue-400 font-bold" : ""}>
                  Step 3: {hasExistingScenes ? "Rebuild Timeline" : "Generate Timeline"}
                </span>
              </div>
            </div>

            {hasExistingScenes ? (
                <TimelineEditor 
                  initialScenes={scenes || []} 
                  media={projectMedia || []} 
                  voiceMedia={voiceMedia} 
                  projectId={project.id} 
                  sections={activeSections} 
                />
            ) : (
              <div className="p-8 text-center border-2 border-dashed rounded-xl border-slate-200 dark:border-slate-800 text-slate-500">
                No timeline generated yet. Upload media to your script sections and click "Generate Timeline".
              </div>
            )}
          </div>

        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-red-800 dark:text-red-400 uppercase tracking-wider mb-2">Danger Zone</h2>
            <form action={async () => { "use server"; await deleteProject(project.id); redirect('/projects'); }}>
              <Button type="submit" variant="destructive" className="w-full">Delete Project</Button>
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}
