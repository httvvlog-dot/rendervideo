const fs = require('fs');
let content = fs.readFileSync('src/app/login/actions.ts', 'utf8');
content = content.replace('}\\n', '}');
try {
  fs.writeFileSync('src/app/login/actions.ts', content, 'utf8');
  console.log('Fixed');
} catch (e) {
  console.error('Error:', e.message);
}
