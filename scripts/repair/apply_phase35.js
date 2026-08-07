const fs = require('fs');
const path = require('path');

// 1. Move adapters
const adaptersDirSrc = path.join(process.cwd(), 'refactor_temp_v4');
const adaptersDirDst = path.join(process.cwd(), 'src', 'utils', 'provider-runtime', 'adapters');

if (!fs.existsSync(adaptersDirDst)) {
  fs.mkdirSync(adaptersDirDst, { recursive: true });
}

const adapterFiles = ['openrouter-adapter.ts', 'cloudflare-r2-adapter.ts', 'adapters-index.ts'];
adapterFiles.forEach(file => {
  const src = path.join(adaptersDirSrc, file);
  const dst = file === 'adapters-index.ts' ? path.join(adaptersDirDst, 'index.ts') : path.join(adaptersDirDst, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
  }
});

// 2. Overwrite types and index for runtime
fs.copyFileSync(path.join(adaptersDirSrc, 'types.ts'), path.join(process.cwd(), 'src', 'utils', 'provider-runtime', 'types.ts'));
fs.copyFileSync(path.join(adaptersDirSrc, 'runtime-index.ts'), path.join(process.cwd(), 'src', 'utils', 'provider-runtime', 'index.ts'));

// 3. Overwrite script-actions and media-actions
fs.copyFileSync(path.join(adaptersDirSrc, 'script-actions.ts'), path.join(process.cwd(), 'src', 'app', '(user)', 'projects', '[id]', 'script-actions.ts'));
fs.copyFileSync(path.join(adaptersDirSrc, 'media-actions.ts'), path.join(process.cwd(), 'src', 'app', '(user)', 'projects', '[id]', 'media-actions.ts'));

// 4. Update imports in script-generator.tsx
const generatorFile = path.join(process.cwd(), 'src', 'app', '(user)', 'projects', '[id]', 'components', 'script-generator.tsx');
if (fs.existsSync(generatorFile)) {
  let content = fs.readFileSync(generatorFile, 'utf8');
  content = content.replace(/from "\.\.\/actions"/g, 'from "../script-actions"');
  fs.writeFileSync(generatorFile, content, 'utf8');
}

// 5. Deprecate generateScript in actions.ts
const actionsFile = path.join(process.cwd(), 'src', 'app', '(user)', 'projects', '[id]', 'actions.ts');
if (fs.existsSync(actionsFile)) {
  let content = fs.readFileSync(actionsFile, 'utf8');
  content = content.replace(/export async function generateScript/g, '/** @deprecated Use generateScript in script-actions.ts instead */\nexport async function generateScript');
  fs.writeFileSync(actionsFile, content, 'utf8');
}

console.log('[OK] Applied Phase 3.5 Adapter Pattern and Migrations');
