const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/utils/s3-signer.ts');
if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('body: buffer\n')) {
    content = content.replace(
      'body: buffer\n',
      'body: buffer as unknown as BodyInit\n'
    );
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('[OK] Patched s3-signer.ts');
  } else {
    console.log('[SKIP] s3-signer.ts already patched');
  }
} else {
  console.log('[ERROR] s3-signer.ts not found');
}
