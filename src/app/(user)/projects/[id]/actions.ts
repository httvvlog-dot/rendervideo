"use server"

import { createClient } from "@/utils/supabase/server"
import { getCurrentUser } from "@/utils/auth-service"
import { revalidatePath } from "next/cache"

export async function generateScript(projectId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")

  const supabase = await createClient()

  // 1. Fetch project to ensure ownership and get details
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single()

  if (projErr || !project) throw new Error("Project not found")

  // Set state to processing
  let newWorkflowState = { ...project.workflow_state, script: "processing" }
  await supabase.from("projects").update({ workflow_state: newWorkflowState, status: "scripting" }).eq("id", projectId)
  
  // To allow UI to show processing immediately
  revalidatePath(`/projects/${projectId}`)

  try {
    const startTime = Date.now()

    // 2. Fetch LLM Provider
    const { data: providers, error: provErr } = await supabase
      .from("providers")
      .select("*")
      .eq("provider_type", "llm")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(1)

    if (provErr || !providers || providers.length === 0) {
      throw new Error("No active LLM provider found")
    }

    const llmConfig = providers[0].config_json
    if (!llmConfig?.apiKey) {
      throw new Error("LLM provider API key is missing")
    }

    const apiKey = llmConfig.apiKey
    // Default to gemini-1.5-flash if not configured
    const model = llmConfig.defaultModel || "google/gemini-1.5-flash"
    
    // 3. Build Prompt
    const duration = project.video_length || 10
    const language = project.language === "vi" ? "Vietnamese" : "English"
    const topic = project.topic
    
    const prompt = `You are a professional YouTube video scriptwriter. 
Write a highly engaging video script about "${topic}".
Language: ${language}.
Target duration: ${duration} minutes.

The script must only contain the spoken voiceover text. Do not include camera directions, visual cues, or scene markers. Just the pure text that will be synthesized into speech.`

    // 4. Call OpenRouter
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }]
      })
    })

    if (!res.ok) {
      const errBody = await res.text()
      throw new Error(`OpenRouter API Error: ${res.status} ${errBody}`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ""
    const tokens_input = data.usage?.prompt_tokens || 0
    const tokens_output = data.usage?.completion_tokens || 0
    const latency_ms = Date.now() - startTime

    // Calculate mock cost if openrouter doesn't return exact. 
    // Gemini 1.5 flash via openrouter is roughly $0.075 / 1M input, $0.30 / 1M output
    const cost = (tokens_input * 0.000000075) + (tokens_output * 0.00000030)

    // 5. Determine version
    const { count: existingCount } = await supabase
      .from("scripts")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      
    const version = (existingCount || 0) + 1

    // 6. Save Script
    const { error: insertErr } = await supabase.from("scripts").insert({
      project_id: projectId,
      content: content.trim(),
      word_count: content.split(/\s+/).length,
      version,
      provider: "OpenRouter",
      model: model,
      prompt: prompt,
      tokens_input,
      tokens_output,
      cost,
      latency_ms
    })

    if (insertErr) throw new Error("Failed to save script: " + insertErr.message)

    // 7. Update Project
    newWorkflowState.script = "completed"
    await supabase.from("projects").update({ 
      workflow_state: newWorkflowState,
      status: "voicing" // Move to next status
    }).eq("id", projectId)

    revalidatePath(`/projects/${projectId}`)
    return { success: true }
    
  } catch (error: any) {
    // Revert state on failure
    console.error("Script Generation Error:", error)
    newWorkflowState.script = "failed"
    await supabase.from("projects").update({ 
      workflow_state: newWorkflowState,
      status: "draft"
    }).eq("id", projectId)
    
    revalidatePath(`/projects/${projectId}`)
    return { error: error.message || "An unknown error occurred" }
  }
}

export async function deleteScript(scriptId: string, projectId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")

  const supabase = await createClient()

  // Ensure ownership
  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single()
  if (!project) throw new Error("Unauthorized")

  const { error } = await supabase.from("scripts").delete().eq("id", scriptId)
  if (error) return { error: error.message }

  // Check if there are any remaining scripts
  const { count } = await supabase.from("scripts").select("*", { count: "exact", head: true }).eq("project_id", projectId)
  
  if (count === 0) {
    // Revert workflow state if no scripts left
    const { data: proj } = await supabase.from("projects").select("workflow_state").eq("id", projectId).single()
    if (proj) {
      const newState = { ...proj.workflow_state, script: "pending" }
      await supabase.from("projects").update({ workflow_state: newState, status: "draft" }).eq("id", projectId)
    }
  }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
