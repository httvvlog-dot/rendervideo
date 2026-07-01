const fs = require('fs');
const path = require('path');

const tablePath = path.join(process.cwd(), 'src/app/admin/providers/components/provider-table.tsx');
if (fs.existsSync(tablePath)) {
  let content = fs.readFileSync(tablePath, 'utf8');

  // Fix the missing error handling in handleSubmit
  const oldCode = `      await saveProvider(payload)
      closeSheet()`;
      
  const newCode = `      const res = await saveProvider(payload)
      if (res.error) {
        toast.error("Error: " + res.error)
      } else {
        toast.success("Provider saved successfully!")
        closeSheet()
      }`;

  if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(tablePath, content, 'utf8');
    console.log('[OK] Patched provider-table.tsx error handling');
  } else {
    console.log('[WARN] Could not find exact code block to replace');
  }
}
