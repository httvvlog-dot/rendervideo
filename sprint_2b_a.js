const fs = require('fs');
const path = require('path');

const baseDir = process.cwd();

// 1. Create Placeholder Pages
const pages = ['settings', 'templates', 'users', 'logs'];

pages.forEach(page => {
  const pageDir = path.join(baseDir, 'src', 'app', 'admin', page);
  if (!fs.existsSync(pageDir)) {
    fs.mkdirSync(pageDir, { recursive: true });
  }

  const Title = page.charAt(0).toUpperCase() + page.slice(1);
  const content = `
export default function ${Title}Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">${Title}</h1>
      </div>
      <div className="border border-dashed border-slate-300 dark:border-slate-800 rounded-lg h-[400px] flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <p className="text-lg font-medium">${Title} module is under construction</p>
          <p className="text-sm mt-1">This section will be implemented in the upcoming sprint.</p>
        </div>
      </div>
    </div>
  );
}
`;
  fs.writeFileSync(path.join(pageDir, 'page.tsx'), content.trim(), 'utf8');
});

// 2. Patch AdminSidebar
const sidebarPath = path.join(baseDir, 'src', 'components', 'admin-sidebar.tsx');
try {
  let sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
  sidebarContent = sidebarContent.replace(
    'import { LayoutDashboard, Users, Server, Settings, FileCode2, Video } from "lucide-react"',
    'import { LayoutDashboard, Users, Server, Settings, FileCode2, Video, ScrollText } from "lucide-react"'
  );
  sidebarContent = sidebarContent.replace(
    /const adminNavItems = \[[\s\S]*?\]/,
    `const adminNavItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Providers", href: "/admin/providers", icon: Server },
  { name: "Templates", href: "/admin/templates", icon: FileCode2 },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Settings", href: "/admin/settings", icon: Settings },
  { name: "Logs", href: "/admin/logs", icon: ScrollText },
  { name: "System Validation", href: "/admin/system", icon: Server },
]`
  );
  fs.writeFileSync(sidebarPath, sidebarContent, 'utf8');
} catch (e) { console.error('Error patching sidebar', e); }

// 3. Patch AdminLayout
const layoutPath = path.join(baseDir, 'src', 'app', 'admin', 'layout.tsx');
try {
  let layoutContent = fs.readFileSync(layoutPath, 'utf8');
  // Remove the debug logs to clean it up
  layoutContent = layoutContent.replace(/[\s]*console\.log\("=== ADMIN DEBUG ==="\);[\s\S]*?console\.log\("role check result:".*?\);/, '');
  layoutContent = layoutContent.replace('<AdminTopbar />', '<AdminTopbar user={user} />');
  fs.writeFileSync(layoutPath, layoutContent, 'utf8');
} catch (e) { console.error('Error patching layout', e); }

// 4. Patch AdminTopbar
const topbarPath = path.join(baseDir, 'src', 'components', 'admin-topbar.tsx');
try {
  let topbarContent = fs.readFileSync(topbarPath, 'utf8');
  
  // Add prop type and update signature
  topbarContent = topbarContent.replace(
    'export function AdminTopbar() {',
    `export function AdminTopbar({ user }: { user?: any }) {
  const getInitials = (email: string) => {
    if (!email) return "AD";
    return email.substring(0, 2).toUpperCase();
  };`
  );

  // Update Avatar and Email/Role display
  const avatarReplacement = `
        <div className="hidden md:flex flex-col items-end mr-2">
          <span className="text-sm font-medium leading-none">{user?.email || "Admin"}</span>
          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1 bg-blue-50 dark:bg-blue-900/30 px-1.5 rounded uppercase">{user?.role || "Admin"}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative h-8 w-8 rounded-full")}>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100">{getInitials(user?.email)}</AvatarFallback>
            </Avatar>
`;
  topbarContent = topbarContent.replace(
    /<DropdownMenu>\s*<DropdownMenuTrigger className=\{cn\(buttonVariants\(\{ variant: "ghost", size: "icon" \}\), "relative h-8 w-8 rounded-full"\)\}>\s*<Avatar className="h-8 w-8">\s*<AvatarFallback.*?<\/AvatarFallback>\s*<\/Avatar>\s*/,
    avatarReplacement
  );

  fs.writeFileSync(topbarPath, topbarContent, 'utf8');
} catch (e) { console.error('Error patching topbar', e); }

console.log('[OK] Generated UI skeleton and patched admin components successfully.');
