const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/login/actions.ts');

try {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix login error
  content = content.replace(
    /return \{ error: "Could not authenticate user" \}/g,
    'return { error: error.message }'
  );

  // Handle email confirmation for signup
  content = content.replace(
    /const \{ error \} = await supabase\.auth\.signUp\(data\)/,
    'const { data: signUpData, error } = await supabase.auth.signUp(data)'
  );

  content = content.replace(
    /if \(error\) \{\s*return \{ error: error\.message \}\s*\}/,
    `if (error) {
    return { error: error.message }
  }
  
  if (signUpData?.user && !signUpData?.session) {
    return { error: "Đăng ký thành công! Vui lòng kiểm tra hộp thư email của bạn để xác nhận tài khoản." }
  }`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log("[OK] Đã sửa file actions.ts thành công!");
} catch (e) {
  console.error("[ERROR]", e.message);
}
