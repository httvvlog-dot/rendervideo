const fs = require('fs');
const path = require('path');

const filePath = path.resolve(process.cwd(), 'src/components/ui/dropdown-menu.tsx');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Use a flexible regular expression to find the exact signature regardless of spacing/newlines
  const regex = /inset\?:\s*boolean[\s\r\n]*variant\?:\s*"default"\s*\|\s*"destructive"[\s\r\n]*\}\)\s*\{/;
  
  const replaceStr = `inset?: boolean
  variant?: "default" | "destructive"
  asChild?: boolean
}) {`;

  if (regex.test(content)) {
    content = content.replace(regex, replaceStr);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("\\n🎉 Build error fixed successfully!");
  } else if (content.includes('asChild?: boolean')) {
    console.log("\\n✅ File is already patched.");
  } else {
    console.error("\\n⚠️ Regex did not match the file contents. The structure might be different than expected.");
  }
} catch (err) {
  console.error("\\n⚠️ Failed to patch dropdown-menu.tsx:", err.message);
  console.log("Make sure you are running this in an elevated Administrator terminal.");
}
