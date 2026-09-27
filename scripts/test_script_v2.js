async function runTest() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  const topic = "Phân tích giá Bitcoin từ hiện tại đến năm 2027";
  const language = "vietnamese";
  const targetDuration = 60;
  
  function requiresCurrentData(topic) {
    const keywords = [
      "hiện nay", "hiện tại", "hôm nay", "mới nhất", "tin tức", 
      "thị trường", "dự báo", "current", "news", "financial", 
      "market", "price", "today", "recent", "latest", "now", "forecast"
    ];
    return keywords.some(k => topic.toLowerCase().includes(k));
  }
  
  const willSearch = requiresCurrentData(topic);
  console.log("=== SEARCH STEP ===");
  console.log("Regex triggered?", willSearch);

  let researchData = "";
  let searchRawResponse = null;

  if (willSearch) {
    const searchReq = {
      model: "perplexity/sonar",
      messages: [{ role: "user", content: `Provide the latest news, market data, and verified facts about: ${topic}. Include dates and sources. Keep it dense and informative.` }]
    };
    console.log("=== SEARCH REQUEST ===");
    console.log(JSON.stringify(searchReq, null, 2));

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openRouterKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(searchReq)
    });
    searchRawResponse = await res.json();
    console.log("=== SEARCH RAW RESPONSE ===");
    console.log(JSON.stringify(searchRawResponse, null, 2));
    
    researchData = searchRawResponse.choices?.[0]?.message?.content || "";
  }

  console.log("=== VERIFIED RESEARCH ===");
  console.log(researchData);

  const currentDate = new Date().toISOString().split('T')[0];
  const wps = 2.5;
  const targetWords = Math.round(targetDuration * wps);
  const minWords = Math.round(targetWords * 0.85);
  const maxWords = Math.round(targetWords * 1.15);
  const targetSections = Math.max(1, Math.round(targetDuration / 12));
  const targetSectionDuration = Math.round(targetDuration / targetSections);
  const targetWordsPerSection = Math.round(targetSectionDuration * wps);

  const promptText = `You are a Subject Matter Expert, Professional AI Cinematographer, and Script Director.

Context: Today's date is ${currentDate}. You do NOT have live internet access.
CRITICAL FINANCIAL & DATA GUARDRAILS:
1. FACT / HISTORICAL DATA: You may use well-known historical facts up to your training data cutoff.
2. CURRENT DATA: Do NOT invent, guess, or hallucinate current market prices, statistics, or events. If the topic requires exact current data, either state that live data is unavailable or anchor your analysis solely on historical trends.
3. SCENARIO / FORECAST: When asked to forecast the future, you MUST use Scenario Analysis (e.g., Bull/Bear/Base cases). NEVER invent a specific definitive price target unless explicitly presented as a hypothetical scenario based on clear assumptions.

Topic: ${topic}
Language: ${language}
Target Duration: ${targetDuration} seconds

=== PART A: CONTENT & NARRATION (PRIMARY PRIORITY) ===
Your FIRST goal is to write a high-quality, valuable, and structured script. Do not write filler narration merely to create scenes. The narration is the core content. Images support the narration.

1. Adapt to User Intent:
Internally recognize the type of content requested (Analysis, Education, Documentary, Story, Commercial, News, etc.) and use the most appropriate logical structure.

2. Narration Depth & Quality:
Avoid generic filler, repeating the topic, empty motivational language, or unsupported statistics. Every sentence must add NEW informational value.

3. Word Count & Pacing Guidelines (CRITICAL):
- TOTAL SCRIPT: You MUST strictly keep the total narration between ${minWords} and ${maxWords} words.
- SECTION PACING: Do not write more than ${targetWordsPerSection + 5} words per section (assuming an average section duration of ${targetSectionDuration} seconds). 
- DISTRIBUTE EVENLY: Distribute the narration evenly across all ${targetSections} sections. Do NOT cram too much text into Section 1.

=== PART B: VISUAL DIRECTION ===
Your SECOND goal is to divide your narration into logical visual sections (approximately ${targetSections} sections).

Rules for Visuals:
1. Always generate PHOTOREALISTIC images.
2. Produce prompts suitable for Flux Dev.
3. Target 1080x1920 (portrait), not 8K.
4. Focus on realism instead of fantasy.
5. Every object must exist in the real world.
6. Camera language must resemble professional DSLR or cinema photography.
7. Never invent subjects that are not mentioned.
8. If uncertain, stay conservative instead of hallucinating.

GOLDEN RULE FOR AI IMAGE PROMPT GENERATION:
- Visual Description MUST be generated from the actual narration of that section. DO NOT generate Visual Description merely from project.topic.
- For every section: Narration -> Visual Description -> Image Prompt. The visual must represent the actual information being narrated.
  Example: 
  Narration: "Fed interest rates and global liquidity can affect Bitcoin's risk appetite."
  Correct visual: financial dashboard showing Fed rate, liquidity indicators and BTC chart.
  Incorrect: generic Bitcoin investment seminar.
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
      "visual_description": "Visual Story (Language: ${language}, describing camera angle, subjects, actions).",
      "image_prompt": "Template Format (MUST BE 100% ENGLISH ONLY):\\nSubject: [English translation of subject]...\\nScene: [English translation of scene]...\\nCamera: DSLR photography.\\nLighting: Soft natural lighting.\\nComposition: Cinematic composition.\\nPhotorealistic commercial photography.\\n1080x1920 portrait\\nNatural color grading.",
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

  let finalPrompt = promptText;
  if (researchData) {
    finalPrompt = finalPrompt.replace("=== PART A: CONTENT & NARRATION (PRIMARY PRIORITY) ===", `
=== VERIFIED RESEARCH (CRITICAL CONTEXT) ===
The following research data was retrieved from a real-time web search. You MUST use this data for all current facts:
${researchData}

CURRENT DATA RULES:
1. Current numerical facts MUST come ONLY from VERIFIED RESEARCH.
2. NEVER invent current prices.
3. NEVER modify current prices.
4. NEVER round current prices.
5. NEVER introduce current statistics absent from Research.
6. If Research does not contain a required current fact, say that the data is unavailable.
7. Historical facts must be clearly treated as historical.
8. Future forecasts MUST be expressed as scenarios.
9. Never present a third-party forecast as a guaranteed fact.
10. Never use model memory to replace missing current data.

=== PART A: CONTENT & NARRATION (PRIMARY PRIORITY) ===`);
  }

  console.log("=== GPT REQUEST PROMPT ===");
  console.log(finalPrompt);

  const gptReq = {
    model: "openai/gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: finalPrompt }]
  };

  const gptRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openRouterKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(gptReq)
  });
  const gptRaw = await gptRes.json();
  console.log("=== GPT RAW RESPONSE ===");
  console.log(JSON.stringify(gptRaw, null, 2));

  console.log("=== FINAL JSON ===");
  console.log(gptRaw.choices?.[0]?.message?.content);
}
runTest().catch(console.error);
