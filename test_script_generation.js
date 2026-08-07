import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const projectId = '085eb130-1c25-4ad1-8d92-aedc85fe1e65';
  
  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
  const targetDuration = project.target_duration || 120;
  
  const langLower = (project.language || "vietnamese").toLowerCase();
  const wps = (langLower.includes("vi") || langLower.includes("việt")) ? 2.5 : 2.2;
  const targetWords = Math.round(targetDuration * wps);
  const minWords = Math.round(targetWords * 0.85);
  const maxWords = Math.round(targetWords * 1.15);
  const targetSections = Math.max(1, Math.round(targetDuration / 12));
  const currentDate = new Date().toISOString().split('T')[0];
  
  const domain = {
      system_prompt: "Your task is to convert each Visual Story into a realistic commercial photography prompt.",
      camera_style: "DSLR photography. Shallow depth of field.",
      lighting_style: "Soft natural lighting.",
      composition_style: "Cinematic composition.",
      negative_prompt_template: { style: ["cartoon", "anime", "painting", "fantasy"], objects: ["random objects"], quality: ["low quality", "blur"] }
  };
  
  const canvasConfig = { width: 1080, height: 1920, orientation: 'portrait' };

  const promptText = `You are a Subject Matter Expert, Professional AI Cinematographer, and Script Director.

Context: Today's date is ${currentDate}. (This date is contextual information only. You do NOT have live internet access. If the topic requires recent data or future forecasts, rely on historical trends and phrase your analysis as projections and scenarios rather than claiming definitive current statistics).

Topic: ${project.topic}
Language: ${project.language}
Target Duration: ${targetDuration} seconds

=== PART A: CONTENT & NARRATION (PRIMARY PRIORITY) ===
Your FIRST goal is to write a high-quality, valuable, and structured script. Do not write filler narration merely to create scenes. The narration is the core content. Images support the narration.

1. Adapt to User Intent:
Internally recognize the type of content requested (Analysis, Education, Documentary, Story, Commercial, News, etc.) and use the most appropriate logical structure.
- If ANALYSIS: prioritize context, key drivers, cause/effect, evidence, scenarios, risks, and conclusion.
- If COMMERCIAL: hook, problem, product value, benefits, CTA.
- If STORY: hook, character, conflict, climax, resolution.
(Do NOT output the content type, just use the right structure).

2. Narration Depth & Quality:
Avoid generic filler, repeating the topic, empty motivational language, or unsupported statistics. Every sentence must add NEW informational value.

3. Word Count Guidelines:
Target a narration length around ${minWords} to ${maxWords} words (approximately ${targetWords} words).
This is guidance, not an absolute limit. Prefer completing important ideas rather than cutting valuable content unnaturally.

=== PART B: VISUAL DIRECTION ===
Your SECOND goal is to divide your narration into logical visual sections (approximately ${targetSections} sections, but this is just a guideline based on pacing). A complex video may require more sections; a slow emotional story may require fewer. Each section should represent ONE coherent content idea and ONE primary visual concept.

Your task is NOT to translate Vietnamese into English.
${domain.system_prompt}

Rules for Visuals:
1. Always generate PHOTOREALISTIC images.
2. Produce prompts suitable for Flux Dev.
3. Target ${canvasConfig.width}x${canvasConfig.height} (${canvasConfig.orientation}), not 8K.
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
- First determine what the narration means. Then create the most relevant visual representation. The image prompt MUST support that specific narration. Avoid generic unrelated cinematic images.
- Imagine pressing the PAUSE button on a movie. Describe exactly what appears in that one frame.
- CRITICAL: The "image_prompt" field MUST ALWAYS be written entirely in ENGLISH, regardless of the project language or narration language. The semantic Subject and Scene descriptions must be translated into English.

=== OUTPUT FORMAT ===
Do NOT output any chain-of-thought, hidden reasoning, or analysis. Plan internally, then output ONLY a valid JSON object matching exactly this schema:
{
  "title": "Video Title",
  "total_duration_seconds": ${targetDuration},
  "sections": [
    {
      "section_index": 1,
      "title": "Section Title",
      "narration": "Spoken text for this section.",
      "duration_seconds": 10,
      "visual_description": "Visual Story (Language: ${project.language}, describing camera angle, subjects, actions).",
      "image_prompt": "Template Format (MUST BE 100% ENGLISH ONLY):\\nSubject: [English translation of subject]...\\nScene: [English translation of scene]...\\nCamera: ${domain.camera_style}\\nLighting: ${domain.lighting_style}\\nComposition: ${domain.composition_style}\\nPhotorealistic commercial photography.\\n${canvasConfig.width}x${canvasConfig.height} ${canvasConfig.orientation}\\nNatural color grading.",
      "negative_prompt": {
        "style": ["cartoon", "anime"],
        "objects": ["watermark", "text"],
        "quality": ["blur"]
      },
      "recommended_image_count": 1,
      "keywords": ["tag1", "tag2"]
    }
  ]
}

Important:
- Return ONLY the JSON object, no markdown wrappers, no explanations.
- The 'duration_seconds' field is an INITIAL ESTIMATE. Ensure the sum of duration_seconds roughly aligns with ${targetDuration} seconds.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: promptText }]
    })
  });
  
  const json = await response.json();
  const content = json.choices[0].message.content;
  console.log(content);
}

run();
