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
  async testConnection(options: { credential: any, mode?: "quick" | "deep", [key: string]: any }) {
    const { credential, mode = "quick" } = options;
    const config = credential.config_json || {};
    const apiKey = credential.encrypted_key || config.apiKey || config.api_key;
    const defaultModel = config.default_model || config.defaultModel;

    if (!apiKey) return { success: false, error: "OPENROUTER_AUTH_FAILED: Missing API Key", latency: 0 };
    if (!defaultModel) return { success: false, error: "MODEL_NOT_SELECTED: Missing Default Model", latency: 0 };

    const startTime = Date.now();
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: defaultModel,
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 1
        })
      });

      const latency = Date.now() - startTime;

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error?.message || `Status ${res.status}`;
        let structuredError = "OPENROUTER_CONNECTION_FAILED";
        const lowerMsg = errMsg.toLowerCase();

        if (res.status === 401) {
           structuredError = "OPENROUTER_AUTH_FAILED";
        } else if (res.status === 402 || lowerMsg.includes("credit") || lowerMsg.includes("balance")) {
           structuredError = "OPENROUTER_INSUFFICIENT_CREDITS";
        } else if (res.status === 403) {
           structuredError = "MODEL_ACCESS_DENIED";
        } else if (res.status === 404 || lowerMsg.includes("does not exist") || lowerMsg.includes("model")) {
           structuredError = "MODEL_NOT_AVAILABLE";
        } else if (res.status === 429) {
           structuredError = "OPENROUTER_RATE_LIMITED";
        }
        
        return { success: false, error: structuredError, status: res.status, details: errMsg, latency };
      }

      return { success: true, latency, status: res.status };
    } catch (e: any) {
      return { success: false, error: e.message, latency: Date.now() - startTime };
    }
  }

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
