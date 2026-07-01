const fs = require('fs');
const path = require('path');

const actionsPath = path.join(process.cwd(), 'src/app/(user)/projects/actions.ts');
if (fs.existsSync(actionsPath)) {
  let content = fs.readFileSync(actionsPath, 'utf8');
  content = content.replace('copyData.title = \\`\\${copyData.title} (Copy)\\`', 'copyData.title = `${copyData.title} (Copy)`');
  fs.writeFileSync(actionsPath, content, 'utf8');
  console.log('[OK] Fixed actions.ts syntax error');
}
