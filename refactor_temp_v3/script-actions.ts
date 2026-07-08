"use server"

import { createClient } from "@/utils/supabase/server"
import { getCurrentUser } from "@/utils/auth-service"
import { revalidatePath } from "next/cache"
import { ProviderRuntime } from "@/utils/provider-runtime"

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
    // 2. Execute with automatic failover and telemetry logging
    const responseData = await runtime.execute({
      step: "SCRIPT",
      projectId: projectId,
      operation: async (credential) => {
        const apiKey = credential.config_json?.apiKey;
        const model = credential.config_json?.defaultModel;

        if (!apiKey) throw new Error("API Key missing in credential");
        if (!model) throw new Error("defaultModel is missing in credential configuration");

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
        });

        if (!res.ok) {
          throw new Error(`OpenRouter API error: ${res.status}`);
        }

        const data = await res.json();
        // Return structured data for telemetry tracking (cost/tokens)
        return {
          content: data.choices?.[0]?.message?.content || "",
          tokensInput: data.usage?.prompt_tokens || 0,
          tokensOutput: data.usage?.completion_tokens || 0
        };
      }
    });

    const { content, tokensInput, tokensOutput } = responseData;
    const cost = ((tokensInput * 0.15) + (tokensOutput * 0.6)) / 1000000;

    const { data: existingScripts } = await supabase.from("scripts").select("version").eq("project_id", projectId).order("version", { ascending: false }).limit(1)
    const nextVersion = existingScripts && existingScripts.length > 0 ? existingScripts[0].version + 1 : 1

    const { error: insertErr } = await supabase.from("scripts").insert({
      project_id: projectId,
      content: content,
      version: nextVersion,
      model_used: "Runtime Model", // Model is logged in runtime_logs
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
    // Runtime has exhausted all credentials or a critical error occurred
    await supabase.from("projects").update({
      workflow_state: { ...project.workflow_state, script: "failed" }
    }).eq("id", projectId)
    throw new Error(`Failed to generate script after exhausting all credentials: ${err.message}`)
  }
}
