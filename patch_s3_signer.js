const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/utils/s3-signer.ts');
if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace all occurrences of "body: buffer" with the type cast
  // ensuring we don't accidentally replace if already patched
  if (content.includes('body: buffer') && !content.includes('as BodyInit')) {
    content = content.replace(/body:\s*buffer/g, 'body: buffer as unknown as BodyInit');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('[OK] Patched s3-signer.ts successfully');
  } else {
    console.log('[SKIP] s3-signer.ts already patched or text not found');
  }
} else {
  console.log('[ERROR] s3-signer.ts not found');
}
