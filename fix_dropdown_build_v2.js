const fs = require('fs');
const path = require('path');

const filePath = path.resolve(process.cwd(), 'src/components/ui/dropdown-menu.tsx');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace using exactly what is in the file
  const searchStr = \`  inset?: boolean
  variant?: "default" | "destructive"
}) {\`;
  
  const replaceStr = \`  inset?: boolean
  variant?: "default" | "destructive"
  asChild?: boolean
}) {\`;

  if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("\\n🎉 Build error fixed successfully!");
  } else if (content.includes('asChild?: boolean')) {
    console.log("\\n✅ File is already patched.");
  } else {
    console.error("\\n⚠️ Could not find the target string in dropdown-menu.tsx to replace.");
  }
} catch (err) {
  console.error("\\n⚠️ Failed to patch dropdown-menu.tsx:", err.message);
  console.log("Make sure you are running this in an elevated Administrator terminal.");
}
