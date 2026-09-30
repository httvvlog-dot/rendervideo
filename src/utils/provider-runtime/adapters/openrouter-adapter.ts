import { ProviderAdapter, ProviderExecutionResult, TestConnectionResult } from "../types"

export interface OpenRouterArgs {
  prompt: string | any[];
  model?: string;
}

export interface OpenRouterResult {
  content: string;
  tokensInput: number;
  tokensOutput: number;
  cost: number;
}

export class OpenRouterAdapter implements ProviderAdapter<OpenRouterArgs, OpenRouterResult> {
  async testConnection(options: { credential: any, mode?: "quick" | "deep", [key: string]: any }): Promise<TestConnectionResult> {
    const { credential, mode = "quick" } = options;
    const config = credential.config_json || {};
    const apiKey = credential.encrypted_key || config.apiKey || config.api_key;
    const defaultModel = config.default_model || config.defaultModel;

    if (!apiKey) return { status: "INVALID", runtimeStatus: "UNKNOWN", latency: 0, provider: "openrouter", message: "Missing API Key" };
    if (!defaultModel) return { status: "INVALID", runtimeStatus: "UNKNOWN", latency: 0, provider: "openrouter", message: "Missing Default Model" };

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
        let runtimeStatus: "HEALTHY" | "RATE_LIMITED" | "NETWORK_ERROR" | "UNKNOWN" = "NETWORK_ERROR";
        let status: "VALID" | "INVALID" | "UNAUTHORIZED" | "UNKNOWN" = "VALID";

        if (res.status === 401) {
           status = "UNAUTHORIZED";
           runtimeStatus = "UNKNOWN";
        } else if (res.status === 429) {
           runtimeStatus = "RATE_LIMITED";
        }
        
        return { status, runtimeStatus, latency, provider: "openrouter", message: errMsg, details: errData };
      }

      return { status: "VALID", runtimeStatus: "HEALTHY", latency, provider: "openrouter", message: "Connection successful" };
    } catch (e: any) {
      let runtimeStatus: "TIMEOUT" | "NETWORK_ERROR" = "NETWORK_ERROR";
      if (e.name === "TimeoutError") runtimeStatus = "TIMEOUT";
      return { status: "VALID", runtimeStatus, latency: Date.now() - startTime, provider: "openrouter", message: e.message };
    }
  }

  async execute(credential: any, args: OpenRouterArgs): Promise<ProviderExecutionResult<OpenRouterResult>> {
    const config = credential.config_json || {};
    const apiKey = config.apiKey || config.api_key;
    const model = args.model || config.defaultModel || config.default_model;

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
