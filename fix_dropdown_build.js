const fs = require('fs');
const path = require('path');

const filePath = path.resolve(process.cwd(), 'src/components/ui/dropdown-menu.tsx');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // A more robust replacement strategy for the DropdownMenuItem props
  const targetInterface = '} {\\n  return (\\n    <MenuPrimitive.Item';
  const newInterface = '  asChild?: boolean\\n} {\\n  return (\\n    <MenuPrimitive.Item';

  if (!content.includes('asChild?: boolean')) {
    content = content.replace(targetInterface, newInterface);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("\\n🎉 Build error fixed! The 'asChild' prop is now supported by DropdownMenuItem.");
  } else {
    console.log("\\n✅ dropdown-menu.tsx is already patched.");
  }
  
  console.log("You can now run 'npm run build' again.");
} catch (err) {
  console.error("\\n⚠️ Failed to patch dropdown-menu.tsx:", err.message);
  console.log("Make sure you are running this in an elevated Administrator terminal.");
}
