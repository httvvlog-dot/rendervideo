const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'user-topbar.tsx');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the buggy form approach with the reliable onClick approach
  const searchPattern = /<form action="\/api\/logout" method="GET">\s*<button type="submit" className="w-full">\s*<DropdownMenuItem className="text-red-600 dark:text-red-400 cursor-pointer">\s*<LogOut className="mr-2 h-4 w-4" \/>\s*<span>Log out<\/span>\s*<\/DropdownMenuItem>\s*<\/button>\s*<\/form>/g;
  
  const replacement = `<DropdownMenuItem onClick={() => window.location.href = '/api/logout'} className="text-red-600 dark:text-red-400 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>`;
            
  if (content.match(searchPattern)) {
    content = content.replace(searchPattern, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("[OK] Patched src/components/user-topbar.tsx");
  } else {
    console.log("[WARNING] Could not find the exact pattern to replace. You might have already fixed it.");
  }
} catch (err) {
  console.error("[ERROR]", err.message);
}
