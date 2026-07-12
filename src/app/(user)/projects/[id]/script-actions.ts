"use server"

import { createClient } from "@/utils/supabase/server"
import { getCurrentUser } from "@/utils/auth-service"
import { revalidatePath } from "next/cache"
import { ProviderRuntime, OpenRouterAdapter } from "@/utils/provider-runtime"
import { z } from "zod"
import { normalizeDurations } from "./duration-normalization"

const ScriptSectionSchema = z.object({
  section_index: z.number(),
  title: z.string().optional(),
  narration: z.string().min(1),
  duration_seconds: z.number().min(1),
  visual_description: z.string().min(1),
  image_prompt: z.string().optional(),
  recommended_image_count: z.number().min(1).max(20).default(1),
  keywords: z.array(z.string()).default([])
})

const ScriptResponseSchema = z.object({
  title: z.string().optional(),
  total_duration_seconds: z.number(),
  sections: z.array(ScriptSectionSchema).min(1)
})

export async function generateScript(projectId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")

  const supabase = await createClient()

  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).single()
  if (!project) throw new Error("Project not found")

  const targetDuration = project.target_duration || (project.video_length * 60) || 60;

  const promptText = `Write a structured video script.
Topic: ${project.topic}
Language: ${project.language}
Target Duration: ${targetDuration} seconds

Return ONLY valid JSON matching this schema:
{
  "title": "Video Title",
  "total_duration_seconds": ${targetDuration},
  "sections": [
    {
      "section_index": 1,
      "title": "Section Title",
      "narration": "Spoken text that naturally fits the duration. Ensure reading speed matches normal Vietnamese pace (~2-3 words per second).",
      "duration_seconds": 8,
      "visual_description": "Description of the visuals needed",
      "image_prompt": "Image generation/search prompt",
      "recommended_image_count": 2,
      "keywords": ["tag1", "tag2"]
    }
  ]
}

Important:
- Return ONLY the JSON object, no markdown wrappers, no explanations.
- Make sure sum of duration_seconds exactly equals ${targetDuration}.
- Make sure narration length is realistic for the allocated duration.`

  const runtime = new ProviderRuntime("openrouter", { 
    retryCount: 2, 
    retryDelay: 1000, 
    failureThreshold: 3 
  });

  try {
    const responseData = await runtime.execute(new OpenRouterAdapter(), {
      step: "SCRIPT",
      projectId: projectId,
      args: { prompt: promptText }
    });

    const { content, tokensInput, tokensOutput, cost } = responseData;
    
    let parsedJson;
    try {
      const match = content.match(/\{[\s\S]*\}/);
      const cleaned = match ? match[0] : content;
      parsedJson = JSON.parse(cleaned);
    } catch (e) {
      throw new Error("Failed to parse AI response as JSON");
    }

    const validated = ScriptResponseSchema.parse(parsedJson);

    validated.sections.forEach((s, idx) => {
      s.section_index = idx + 1;
    });

    const normalizedDurations = normalizeDurations(targetDuration, validated.sections);
    validated.sections.forEach((s, idx) => {
      s.duration_seconds = normalizedDurations[idx];
    });

    const plainTextContent = validated.sections.map(s => 
      `${s.title ? s.title + '\n' : ''}${s.narration}`
    ).join('\n\n');

    const wordCount = plainTextContent.split(/\s+/).filter(w => w.length > 0).length;

    const { error: rpcErr } = await supabase.rpc("save_script_with_sections", {
      p_project_id: projectId,
      p_content: plainTextContent,
      p_word_count: wordCount,
      p_provider: "openrouter",
      p_model: "Runtime Model",
      p_prompt: promptText,
      p_tokens_input: tokensInput,
      p_tokens_output: tokensOutput,
      p_cost: cost,
      p_latency_ms: 0,
      p_sections: validated.sections
    });

    if (rpcErr) throw new Error("Failed to save script: " + rpcErr.message);

    await supabase.from("projects").update({
      workflow_state: { ...project.workflow_state, script: "completed" }
    }).eq("id", projectId)

    revalidatePath(`/projects/${projectId}`)
    return { success: true }

  } catch (err: any) {
    await supabase.from("projects").update({
      workflow_state: { ...project.workflow_state, script: "failed" }
    }).eq("id", projectId)
    throw new Error(`Script generation failed: ${err.message}`)
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

export async function updateScriptSection(sectionId: string, projectId: string, patch: any) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")

  const supabase = await createClient()

  // Validate project ownership explicitly to be perfectly safe, since RLS on script_sections checks it anyway
  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single()
  if (!project) throw new Error("Unauthorized")

  const { error } = await supabase.from("script_sections").update({
    title: patch.title,
    narration: patch.narration,
    visual_description: patch.visual_description,
    image_prompt: patch.image_prompt,
    recommended_image_count: patch.recommended_image_count,
    keywords: patch.keywords,
    updated_at: new Date().toISOString()
  }).eq("id", sectionId).eq("project_id", projectId)

  if (error) throw new Error(error.message)

  if (patch.narration !== undefined || patch.title !== undefined) {
    const { data: sec } = await supabase.from("script_sections").select("script_id").eq("id", sectionId).single()
    if (sec) {
      const { data: allSecs } = await supabase.from("script_sections").select("title, narration").eq("script_id", sec.script_id).order("section_index", { ascending: true })
      if (allSecs) {
        const plainText = allSecs.map(s => `${s.title ? s.title + '\n' : ''}${s.narration}`).join('\n\n')
        const wc = plainText.split(/\s+/).filter(w => w.length > 0).length
        await supabase.from("scripts").update({ content: plainText, word_count: wc }).eq("id", sec.script_id)
      }
    }
  }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
