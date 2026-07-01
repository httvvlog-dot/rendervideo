
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
  const promptText = `Write a video script. Topic: ${project.topic}. Language: ${project.language}. Video duration: ${project.video_length} minutes. Do not include camera directions, just the spoken script.`

  const startTime = Date.now()
  let responseData
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: promptText }]
      })
    })

    if (!res.ok) throw new Error(`OpenRouter API error: ${res.status}`)
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
    word_count: content.split(/\s+/).length,
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

  revalidatePath(`/projects/${projectId}`)
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
  revalidatePath(`/projects/${projectId}`)
}
