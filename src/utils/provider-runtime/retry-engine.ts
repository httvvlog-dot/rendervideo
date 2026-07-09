import { ProviderRuntimeOptions } from "./types"

export interface RetryEngineParams<T> {
  step: any;
  projectId?: string;
  operation: (credential: any) => Promise<T>;
}
import { HealthTracker } from "./health-tracker"
import { PROVIDER_HEALTH_STATUS } from "./types"
import { TelemetryRecorder } from "./telemetry-recorder"
import { RuntimeLogger } from "./runtime-logger"

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

export class RetryEngine {
  private healthTracker: HealthTracker;
  private telemetry: TelemetryRecorder;
  private logger: RuntimeLogger;

  constructor(private options: ProviderRuntimeOptions) {
    this.healthTracker = new HealthTracker(options.failureThreshold || 3);
    this.telemetry = new TelemetryRecorder();
    this.logger = new RuntimeLogger();
  }

  async executeWithRetry<T>(credential: any, params: RetryEngineParams<T>): Promise<{ success: boolean, data?: T, error?: any }> {
    const maxRetries = this.options.retryCount ?? 1;
    const retryDelay = this.options.retryDelay ?? 1000;
    
    let attempts = 0;
    let lastError = null;

    const providerId = credential.provider_id;
    const credentialId = credential.id;

    while (attempts <= maxRetries) {
      attempts++;
      const startTime = Date.now();

      try {
        // Execute operation
        const data = await params.operation(credential);
        const durationMs = Date.now() - startTime;
        
        // On success: update health, telemetry, and log
        await this.healthTracker.recordSuccess(credentialId);
        await this.telemetry.recordLatency(credentialId, durationMs);
        
        await this.logger.log({
          providerId, credentialId, projectId: params.projectId, step: params.step,
          status: "success", durationMs,
          // Extract basic model if it's there
          model: credential.config_json?.defaultModel,
          tokens: (data as any)?.tokensInput ? (data as any).tokensInput + ((data as any).tokensOutput || 0) : undefined,
          // You could also extract cost if passed back
        });

        return { success: true, data };

      } catch (error: any) {
        lastError = error;
        const durationMs = Date.now() - startTime;
        
        // Record failure and classify health status
        const { status } = await this.healthTracker.recordFailure(credentialId, error);

        // Determine if we should retry
        const isRetryable = status === PROVIDER_HEALTH_STATUS.RATE_LIMITED || status === PROVIDER_HEALTH_STATUS.TIMEOUT || status === PROVIDER_HEALTH_STATUS.WARNING;
        const willRetry = attempts <= maxRetries && isRetryable;

        await this.logger.log({
          providerId, credentialId, projectId: params.projectId, step: params.step,
          status: willRetry ? "retrying" : "failed", durationMs, error,
          model: credential.config_json?.defaultModel
        });

        if (willRetry) {
          await delay(retryDelay);
        } else {
          break; // Failover to next credential
        }
      }
    }

    return { success: false, error: lastError };
  }
}
