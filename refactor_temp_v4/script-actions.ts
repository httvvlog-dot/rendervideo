"use server"

import { createClient } from "@/utils/supabase/server"
import { getCurrentUser } from "@/utils/auth-service"
import { revalidatePath } from "next/cache"
import { ProviderRuntime, OpenRouterAdapter } from "@/utils/provider-runtime"

export async function generateScript(projectId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")

  const supabase = await createClient()

  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).single()
  if (!project) throw new Error("Project not found")

  const promptText = `Write a video script. Topic: ${project.topic}. Language: ${project.language}. Video duration: ${project.video_length} minutes. Do not include camera directions, just the spoken script.`

  // 1. Initialize Runtime
  const runtime = new ProviderRuntime("openrouter", { 
    retryCount: 2, 
    retryDelay: 1000, 
    failureThreshold: 3 
  });

  try {
    // 2. Execute with Adapter Pattern
    const responseData = await runtime.execute(new OpenRouterAdapter(), {
      step: "SCRIPT",
      projectId: projectId,
      args: { prompt: promptText }
    });

    const { content, tokensInput, tokensOutput, cost } = responseData;

    const { data: existingScripts } = await supabase.from("scripts").select("version").eq("project_id", projectId).order("version", { ascending: false }).limit(1)
    const nextVersion = existingScripts && existingScripts.length > 0 ? existingScripts[0].version + 1 : 1

    const { error: insertErr } = await supabase.from("scripts").insert({
      project_id: projectId,
      content: content,
      version: nextVersion,
      model_used: "Runtime Model",
      cost: cost,
      created_by: user.id
    })

    if (insertErr) throw new Error(insertErr.message)

    await supabase.from("projects").update({
      workflow_state: { ...project.workflow_state, script: "completed" }
    }).eq("id", projectId)

    revalidatePath(`/projects/${projectId}`)
    return { success: true }

  } catch (err: any) {
    await supabase.from("projects").update({
      workflow_state: { ...project.workflow_state, script: "failed" }
    }).eq("id", projectId)
    throw new Error(`Failed to generate script after exhausting all credentials: ${err.message}`)
  }
}

export async function deleteScriptVersion(scriptId: string, projectId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")

  const supabase = await createClient()

  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single()
  if (!project) throw new Error("Unauthorized")

  const { error } = await supabase.from("scripts").delete().eq("id", scriptId)
  if (error) return { error: error.message }

  const { count } = await supabase.from("scripts").select("*", { count: "exact", head: true }).eq("project_id", projectId)
  
  if (count === 0) {
    const { data: proj } = await supabase.from("projects").select("workflow_state").eq("id", projectId).single()
    if (proj) {
      const newState = { ...proj.workflow_state, script: "pending" }
      await supabase.from("projects").update({ workflow_state: newState, status: "draft" }).eq("id", projectId)
    }
  }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
