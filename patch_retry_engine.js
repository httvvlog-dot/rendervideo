const fs = require('fs');
const path = require('path');

const retryEngineFile = path.join(process.cwd(), 'src/utils/provider-runtime/retry-engine.ts');

if (fs.existsSync(retryEngineFile)) {
  let content = fs.readFileSync(retryEngineFile, 'utf8');

  // Replace ExecuteParams import and define internal RetryEngineParams
  content = content.replace(
    /import \{ ProviderRuntimeOptions, ExecuteParams \} from "\.\/types"/,
    `import { ProviderRuntimeOptions } from "./types"\n\nexport interface RetryEngineParams<T> {\n  step: any;\n  projectId?: string;\n  operation: (credential: any) => Promise<T>;\n}`
  );

  content = content.replace(
    /async executeWithRetry<T>\(credential: any, params: ExecuteParams<T>\)/,
    `async executeWithRetry<T>(credential: any, params: RetryEngineParams<T>)`
  );

  fs.writeFileSync(retryEngineFile, content, 'utf8');
  console.log('[OK] Patched retry-engine.ts');
} else {
  console.log('[ERROR] retry-engine.ts not found');
}
