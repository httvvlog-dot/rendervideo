import { ProviderAdapter, ProviderExecutionResult } from "../types"

export interface OpenRouterArgs {
  prompt: string;
}

export interface OpenRouterResult {
  content: string;
  tokensInput: number;
  tokensOutput: number;
  cost: number;
}

export class OpenRouterAdapter implements ProviderAdapter<OpenRouterArgs, OpenRouterResult> {
  async execute(credential: any, args: OpenRouterArgs): Promise<ProviderExecutionResult<OpenRouterResult>> {
    const config = credential.config_json || {};
    const apiKey = config.apiKey || config.api_key;
    const model = config.defaultModel || config.default_model;

    if (!apiKey) throw new Error("API Key missing in OpenRouter credential");
    if (!model) throw new Error("default_model is missing in OpenRouter credential config_json");

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: args.prompt }]
      })
    });

    if (!res.ok) {
      throw new Error(`OpenRouter API error: ${res.status}`);
    }

    const data = await res.json();
    const tokensInput = data.usage?.prompt_tokens || 0;
    const tokensOutput = data.usage?.completion_tokens || 0;
    
    // Calculate cost based on rough Gemini estimates, or exact if returned
    const cost = ((tokensInput * 0.15) + (tokensOutput * 0.6)) / 1000000;

    return {
      result: {
        content: data.choices?.[0]?.message?.content || "",
        tokensInput,
        tokensOutput,
        cost
      },
      usage: {
        provider: "openrouter",
        model: model,
        pricingType: "token",
        promptTokens: tokensInput,
        completionTokens: tokensOutput
      }
    };
  }
}
