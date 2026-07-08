const fs = require('fs');
const path = require('path');

const cardFile = path.join(process.cwd(), 'src/app/admin/providers/[id]/components/credential-card.tsx');

if (fs.existsSync(cardFile)) {
  let content = fs.readFileSync(cardFile, 'utf8');
  content = content.replace(
    /from "\.\.\/\.\.\/\.\.\/actions"/g,
    'from "../../actions"'
  );
  fs.writeFileSync(cardFile, content, 'utf8');
  console.log('[OK] Fixed import in credential-card.tsx');
} else {
  console.log('[ERROR] File not found');
}
