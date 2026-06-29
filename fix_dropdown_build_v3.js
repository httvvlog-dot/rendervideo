const fs = require('fs');
const path = require('path');

const filePath = path.resolve(process.cwd(), 'src/components/ui/dropdown-menu.tsx');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Normalize line endings to \n to bypass Windows CRLF mismatch issues
  content = content.replace(/\\r\\n/g, '\\n');
  
  const searchStr = '  inset?: boolean\\n  variant?: "default" | "destructive"\\n}) {';
  
  const replaceStr = '  inset?: boolean\\n  variant?: "default" | "destructive"\\n  asChild?: boolean\\n}) {';

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
