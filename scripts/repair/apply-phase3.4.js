const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function replaceInFile(filePath, replacements) {
    const fullPath = path.join(srcDir, filePath);
    if (!fs.existsSync(fullPath)) {
        console.warn(`File not found: ${fullPath}`);
        return;
    }
    let content = fs.readFileSync(fullPath, 'utf8');
    for (const { search, replace } of replacements) {
        content = content.replace(search, replace);
    }
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated ${filePath}`);
}

// 1. types.ts
replaceInFile('utils/provider-runtime/types.ts', [
    {
        search: `export interface ProviderRuntimeOptions`,
        replace: `export const PROVIDER_HEALTH_STATUS = {
  HEALTHY: "healthy",
  WARNING: "warning",
  OFFLINE: "offline",
  RATE_LIMITED: "rate_limited",
  UNAUTHORIZED: "unauthorized",
  TIMEOUT: "timeout",
  UNKNOWN: "unknown",
} as const;

export type ProviderHealthStatus = typeof PROVIDER_HEALTH_STATUS[keyof typeof PROVIDER_HEALTH_STATUS];

export interface ProviderRuntimeOptions`
    }
]);

// 2. health-tracker.ts
replaceInFile('utils/provider-runtime/health-tracker.ts', [
    {
        search: `import { createAdminClient } from "@/utils/supabase/admin"`,
        replace: `import { createAdminClient } from "@/utils/supabase/admin"\nimport { PROVIDER_HEALTH_STATUS, ProviderHealthStatus } from "./types"`
    },
    {
        search: `async recordFailure(credentialId: string, error: any) {`,
        replace: `async recordFailure(credentialId: string, error: any): Promise<{ status: ProviderHealthStatus, currentFailures: number }> {`
    },
    {
        search: `let status = "warning"`,
        replace: `let status: ProviderHealthStatus = PROVIDER_HEALTH_STATUS.WARNING`
    },
    {
        search: `status = "rate_limited"`,
        replace: `status = PROVIDER_HEALTH_STATUS.RATE_LIMITED`
    },
    {
        search: `status = "unauthorized"`,
        replace: `status = PROVIDER_HEALTH_STATUS.UNAUTHORIZED`
    },
    {
        search: `status = "timeout"`,
        replace: `status = PROVIDER_HEALTH_STATUS.TIMEOUT`
    },
    {
        search: `status = "offline"`,
        replace: `status = PROVIDER_HEALTH_STATUS.OFFLINE`
    },
    {
        search: `health_status: "healthy",`,
        replace: `health_status: PROVIDER_HEALTH_STATUS.HEALTHY,`
    }
]);

// 3. retry-engine.ts
replaceInFile('utils/provider-runtime/retry-engine.ts', [
    {
        search: `import { HealthTracker } from "./health-tracker"`,
        replace: `import { HealthTracker } from "./health-tracker"\nimport { PROVIDER_HEALTH_STATUS } from "./types"`
    },
    {
        search: `const isRetryable = status === "rate_limited" || status === "timeout" || status === "warning";\n        const willRetry = attempts <= maxRetries && isRetryable && status !== "offline";`,
        replace: `const isRetryable = status === PROVIDER_HEALTH_STATUS.RATE_LIMITED || status === PROVIDER_HEALTH_STATUS.TIMEOUT || status === PROVIDER_HEALTH_STATUS.WARNING;\n        const willRetry = attempts <= maxRetries && isRetryable;`
    }
]);

// 4. credential-selector.ts
replaceInFile('utils/provider-runtime/credential-selector.ts', [
    {
        search: `export class CredentialSelector {`,
        replace: `import { PROVIDER_HEALTH_STATUS } from "./types";\n\nexport class CredentialSelector {`
    },
    {
        search: `c.health_status !== "offline"`,
        replace: `c.health_status !== PROVIDER_HEALTH_STATUS.OFFLINE`
    }
]);

// 5. admin actions
replaceInFile('app/admin/providers/actions.ts', [
    {
        search: `import { createAdminClient } from "@/utils/supabase/admin"`,
        replace: `import { createAdminClient } from "@/utils/supabase/admin"\nimport { PROVIDER_HEALTH_STATUS } from "@/utils/provider-runtime/types"`
    },
    {
        search: /health_status: 'offline'/g,
        replace: `health_status: PROVIDER_HEALTH_STATUS.OFFLINE`
    },
    {
        search: /health_status: 'healthy'/g,
        replace: `health_status: PROVIDER_HEALTH_STATUS.HEALTHY`
    }
]);

// 6. UI: credential-card.tsx
replaceInFile('app/admin/providers/[id]/components/credential-card.tsx', [
    {
        search: `import { AlertTriangle, CheckCircle2, XCircle, Activity, MoreVertical, Edit2, Trash2, Zap } from "lucide-react"`,
        replace: `import { AlertTriangle, CheckCircle2, XCircle, Activity, MoreVertical, Edit2, Trash2, Zap } from "lucide-react"\nimport { PROVIDER_HEALTH_STATUS } from "@/utils/provider-runtime/types"`
    },
    {
        search: /credential\.health_status === 'healthy'/g,
        replace: `credential.health_status === PROVIDER_HEALTH_STATUS.HEALTHY`
    },
    {
        search: /credential\.health_status === 'warning'/g,
        replace: `credential.health_status === PROVIDER_HEALTH_STATUS.WARNING`
    },
    {
        search: /credential\.health_status === 'offline'/g,
        replace: `credential.health_status === PROVIDER_HEALTH_STATUS.OFFLINE`
    },
    {
        search: /credential\.health_status === 'unknown'/g,
        replace: `credential.health_status === PROVIDER_HEALTH_STATUS.UNKNOWN`
    }
]);

// 7. UI: diagnostics-panel.tsx
replaceInFile('app/admin/providers/components/diagnostics-panel.tsx', [
    {
        search: `import { CheckCircle, AlertTriangle, XCircle, Activity, RefreshCw } from "lucide-react"`,
        replace: `import { CheckCircle, AlertTriangle, XCircle, Activity, RefreshCw } from "lucide-react"\nimport { PROVIDER_HEALTH_STATUS } from "@/utils/provider-runtime/types"`
    },
    {
        search: /healthStatus === 'healthy'/g,
        replace: `healthStatus === PROVIDER_HEALTH_STATUS.HEALTHY`
    },
    {
        search: /healthStatus === 'warning'/g,
        replace: `healthStatus === PROVIDER_HEALTH_STATUS.WARNING`
    },
    {
        search: /healthStatus === 'offline'/g,
        replace: `healthStatus === PROVIDER_HEALTH_STATUS.OFFLINE`
    },
    {
        search: /healthStatus === 'unknown'/g,
        replace: `healthStatus === PROVIDER_HEALTH_STATUS.UNKNOWN`
    },
    {
        search: /health_status \|\| "unknown"/g,
        replace: `health_status || PROVIDER_HEALTH_STATUS.UNKNOWN`
    },
    {
        search: /healthStatus === "healthy"/g,
        replace: `healthStatus === PROVIDER_HEALTH_STATUS.HEALTHY`
    }
]);

// 8. UI: provider-cards.tsx
replaceInFile('app/admin/providers/components/provider-cards.tsx', [
    {
        search: `import { Activity, Zap, HardDrive, Type, Image as ImageIcon, Video, ArrowRight } from "lucide-react"`,
        replace: `import { Activity, Zap, HardDrive, Type, Image as ImageIcon, Video, ArrowRight } from "lucide-react"\nimport { PROVIDER_HEALTH_STATUS } from "@/utils/provider-runtime/types"`
    },
    {
        search: /health_status \|\| 'unknown'/g,
        replace: `health_status || PROVIDER_HEALTH_STATUS.UNKNOWN`
    },
    {
        search: /healthStatus === 'healthy'/g,
        replace: `healthStatus === PROVIDER_HEALTH_STATUS.HEALTHY`
    },
    {
        search: /healthStatus === 'warning'/g,
        replace: `healthStatus === PROVIDER_HEALTH_STATUS.WARNING`
    },
    {
        search: /healthStatus === 'offline'/g,
        replace: `healthStatus === PROVIDER_HEALTH_STATUS.OFFLINE`
    }
]);

// 9. Admin System: page.tsx
replaceInFile('app/admin/system/page.tsx', [
    {
        search: `function StatusRow({ icon, label, status, note }: { icon: React.ReactNode, label: string, status: "healthy" | "error" | "pending", note?: string }) {`,
        replace: `export type SystemHealthStatus = "healthy" | "error" | "pending";\n\nfunction StatusRow({ icon, label, status, note }: { icon: React.ReactNode, label: string, status: SystemHealthStatus, note?: string }) {`
    }
]);
