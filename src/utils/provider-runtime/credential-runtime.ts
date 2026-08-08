import { AdapterRegistry } from "./adapters/factory"
import { CredentialAdapter, TestConnectionResult } from "./types"

export class CredentialRuntime {
  constructor(private providerKey: string) {}

  private getAdapter(): CredentialAdapter {
    const adapter = AdapterRegistry.get(this.providerKey)
    if (!adapter) throw new Error(`Adapter not found for provider: ${this.providerKey}`)
    return adapter as any as CredentialAdapter
  }

  async test(config: any): Promise<TestConnectionResult> {
    const adapter = this.getAdapter()
    const safeConfig = adapter.normalizeConfig ? adapter.normalizeConfig(config) : config

    // 1. Validate Format
    if (adapter.validateCredential) {
      const valResult = adapter.validateCredential(safeConfig)
      if (valResult.status === "INVALID") return valResult
    }

    // 2. Ping Provider
    if (adapter.testConnection) {
      return await adapter.testConnection({ credential: { config_json: safeConfig } })
    }

    return { 
      status: "VALID", 
      runtimeStatus: "UNKNOWN", 
      latency: 0, 
      provider: this.providerKey, 
      message: "No test method provided by adapter" 
    }
  }

  normalizeConfig(config: any): any {
    const adapter = this.getAdapter()
    return adapter.normalizeConfig ? adapter.normalizeConfig(config) : config
  }
}
