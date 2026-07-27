"use server"

import { createClient } from "@/utils/supabase/server"
import { getCurrentUser } from "@/utils/auth-service"
import { revalidatePath } from "next/cache"
import { ProviderRuntime, OpenRouterAdapter } from "@/utils/provider-runtime"
import { extractJSONObject } from "@/utils/extract-json-object"
import { z } from "zod"
import { normalizeDurations } from "./duration-normalization"

const ScriptSectionSchema = z.object({
  section_index: z.number(),
  title: z.string().optional(),
  narration: z.string().min(1),
  duration_seconds: z.number().min(1),
  visual_description: z.string().min(1),
  image_prompt: z.string().optional(),
  negative_prompt: z.object({
    style: z.array(z.string()).optional(),
    objects: z.array(z.string()).optional(),
    quality: z.array(z.string()).optional()
  }).optional(),
  recommended_image_count: z.number().min(1).max(20).default(1),
  keywords: z.array(z.string()).default([])
})

const ScriptResponseSchema = z.object({
  title: z.string().optional(),
  total_duration_seconds: z.number(),
  sections: z.array(ScriptSectionSchema).min(1)
})

export async function generateScript(projectId: string): Promise<{ success?: boolean; error?: string }> {
  console.log("ENTER generateScript");
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")

  const supabase = await createClient()

  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).single()
  if (!project) throw new Error("Project not found")

  const targetDuration = project.target_duration || (project.video_length * 60) || 60;

  // Fetch domain config dynamically
  let domainQuery = supabase.from("image_prompt_domains").select("*").eq("is_active", true);
  if (project.topic.toLowerCase().includes("yến")) {
     domainQuery = domainQuery.eq("code", "BIRD_NEST");
  }
  const { data: domainData } = await domainQuery.limit(1).maybeSingle();
  const domain = domainData || {
      system_prompt: "Your task is to convert each Visual Story into a realistic commercial photography prompt.",
      camera_style: "DSLR photography. Shallow depth of field.",
      lighting_style: "Soft natural lighting.",
      composition_style: "Cinematic composition.",
      negative_prompt_template: { style: ["cartoon", "anime", "painting", "fantasy"], objects: ["random objects"], quality: ["low quality", "blur"] }
  };

  const promptText = `You are a Professional AI Cinematographer and Commercial Photography Prompt Engineer.

Your task is NOT to translate Vietnamese into English.
${domain.system_prompt}

Rules:
1. Always generate PHOTOREALISTIC images.
2. Produce prompts suitable for Flux Dev.
3. Target Full HD (1920x1080), not 8K.
4. Focus on realism instead of fantasy.
5. Every object must exist in the real world.
6. Camera language must resemble professional DSLR or cinema photography.
7. Never invent subjects that are not mentioned.
8. If uncertain, stay conservative instead of hallucinating.

GOLDEN RULE FOR AI IMAGE PROMPT GENERATION:
- One Section = One Scene.
- One Scene = One Frozen Moment.
- One Frozen Moment = One Image.
- Never describe a sequence of actions in a single Visual Description.
- Never use words like "sau đó", "tiếp theo", "chuyển sang", "rồi", "then", "next", "followed by", "transition".
- If multiple actions exist in the narration, choose the single most representative visual moment for that Section.
- Imagine pressing the PAUSE button on a movie. Describe exactly what appears in that one frame.

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
      "narration": "Spoken text that naturally fits the duration.",
      "duration_seconds": 8,
      "visual_description": "Visual Story (Vietnamese, describing camera angle, subjects, actions).",
      "image_prompt": "Template Format:\\nSubject: ...\\nScene: ...\\nCamera: ${domain.camera_style}\\nLighting: ${domain.lighting_style}\\nComposition: ${domain.composition_style}\\nPhotorealistic commercial photography.\\n1920x1080\\nNatural color grading.",
      "negative_prompt": {
        "style": ["cartoon", "anime"],
        "objects": ["watermark", "text"],
        "quality": ["blur"]
      },
      "recommended_image_count": 2,
      "keywords": ["tag1", "tag2"]
    }
  ]
}

Important:
- Return ONLY the JSON object, no markdown wrappers, no explanations.
- Make sure sum of duration_seconds exactly equals ${targetDuration}.`;

  const runtime = new ProviderRuntime("openrouter", { 
    retryCount: 2, 
    retryDelay: 1000, 
    failureThreshold: 3 
  });

  const defaultModel = await runtime.getDefaultModel() || "openai/gpt-4o-mini";

  try {
    const { BillingEngine, BillingFeature } = await import("@/utils/billing");
    const responseData = await BillingEngine.executeAndCharge(
      { userId: user.id, projectId: projectId, feature: BillingFeature.SCRIPT_GENERATION },
      { provider: "openrouter", model: defaultModel },
      async (provider, model) => {
        const aiResult = await runtime.execute(new OpenRouterAdapter(), {
          step: "SCRIPT",
          projectId: projectId,
          args: { prompt: promptText }
        });
        return { result: aiResult.result, usage: aiResult.usage, actualUsdCost: aiResult.cost };
      }
    );

    const { content, tokensInput, tokensOutput, cost } = responseData;
    
    // Extract raw JSON
    const parsedJson = extractJSONObject(content);
    
    // Validate schema
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

    const { data, error: rpcErr } = await supabase.rpc("save_script_with_sections", {
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

    const updateData: any = {
      workflow_state: { ...project.workflow_state, script: "completed" }
    };

    if (data && data.script_id) {
      updateData.active_script_id = data.script_id;
    }

    await supabase.from("projects").update(updateData).eq("id", projectId)

    revalidatePath(`/projects/${projectId}`)
    return { success: true }

  } catch (err: any) {
    console.error("FULL ERROR", err);
    throw err;
    // await supabase.from("projects").update({
    //   workflow_state: { ...project.workflow_state, script: "failed" }
    // }).eq("id", projectId)
    // return { error: `Script generation failed: ${err.message}` }
  }
}

export async function deleteScriptVersion(scriptId: string, projectId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) return { error: "Unauthorized" }

    const supabase = await createClient()

    const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single()
    if (!project) return { error: "Unauthorized" }

    const { error } = await supabase.from("scripts").delete().eq("id", scriptId).eq("project_id", projectId)
    if (error) return { error: error.message }

    // If it was the active script, we might want to unset it or just let the client handle it.
    // Client currently sets active to another one before calling delete on the active one, or deletes a non-active one.
    // But we should check if project.active_script_id is null now, or just let DB cascade handle if needed.
    const { data: proj } = await supabase.from("projects").select("active_script_id, workflow_state").eq("id", projectId).single()
    if (proj) {
      const newState = { ...proj.workflow_state, script: "pending" }
      await supabase.from("projects").update({ workflow_state: newState, status: "draft" }).eq("id", projectId)
    }

    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
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
    transition_type: patch.transition_type,
    transition_duration: patch.transition_duration,
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

export async function setActiveScript(projectId: string, scriptId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) return { error: "Unauthorized" }

    const supabase = await createClient()

    // Verify invariant: project belongs to user
    const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single()
    if (!project) return { error: "Unauthorized or project not found" }

    // Verify invariant: script belongs to project
    const { data: script } = await supabase.from("scripts").select("id, project_id").eq("id", scriptId).single()
    if (!script || script.project_id !== projectId) return { error: "Invalid script" }

    const { error } = await supabase.from("projects").update({ active_script_id: scriptId }).eq("id", projectId)
    if (error) return { error: error.message }

    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}
