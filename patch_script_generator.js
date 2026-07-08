const fs = require('fs');
const path = require('path');

const generatorFile = path.join(process.cwd(), 'src/app/(user)/projects/[id]/components/script-generator.tsx');

if (fs.existsSync(generatorFile)) {
  let content = fs.readFileSync(generatorFile, 'utf8');

  // Replace the old res.error pattern with the new throw pattern
  content = content.replace(
    /const res = await generateScript\(projectId\)\s+if \(res\.error\) {\s+toast\.error\("Failed: " \+ res\.error, { id: "script-gen" }\)\s+} else {\s+toast\.success\("Script generated successfully!", { id: "script-gen" }\)\s+}/m,
    `await generateScript(projectId)\n      toast.success("Script generated successfully!", { id: "script-gen" })`
  );

  fs.writeFileSync(generatorFile, content, 'utf8');
  console.log('[OK] Patched script-generator.tsx');
} else {
  console.log('[ERROR] script-generator.tsx not found');
}
