const fs = require('fs');
const path = require('path');

const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx');
if (fs.existsSync(layoutPath)) {
  let content = fs.readFileSync(layoutPath, 'utf8');
  
  if (!content.includes('<Toaster')) {
    content = content.replace(
      'import { ThemeProvider } from "@/components/theme-provider";',
      'import { ThemeProvider } from "@/components/theme-provider";\nimport { Toaster } from "sonner";'
    );
    content = content.replace(
      '          {children}\n        </ThemeProvider>',
      '          {children}\n          <Toaster position="top-center" richColors />\n        </ThemeProvider>'
    );
    fs.writeFileSync(layoutPath, content, 'utf8');
    console.log('[OK] Patched layout.tsx to include Toaster');
  } else {
    console.log('[SKIP] layout.tsx already has Toaster');
  }
} else {
  console.log('[ERROR] layout.tsx not found');
}
