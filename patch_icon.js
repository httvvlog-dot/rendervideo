const fs = require('fs');
const path = require('path');

const clientFile = path.join(process.cwd(), 'src/app/admin/providers/[id]/components/provider-workspace-client.tsx');

if (fs.existsSync(clientFile)) {
  let content = fs.readFileSync(clientFile, 'utf8');
  
  if (!content.includes('Settings,')) {
    content = content.replace(
      'import { ArrowLeft, Server, Volume2, Mic, Cloud, Database, Activity, LayoutGrid, TerminalSquare, PieChart, Box } from "lucide-react"',
      'import { ArrowLeft, Server, Volume2, Mic, Cloud, Database, Activity, LayoutGrid, TerminalSquare, PieChart, Box, Settings } from "lucide-react"'
    );
    fs.writeFileSync(clientFile, content, 'utf8');
    console.log('[OK] Added Settings icon import to provider-workspace-client.tsx');
  } else {
    console.log('[SKIP] Settings import already exists');
  }
} else {
  console.log('[ERROR] provider-workspace-client.tsx not found');
}
