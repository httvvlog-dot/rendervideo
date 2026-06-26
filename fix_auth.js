const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, 'src');

function patchFile(relativePath, replaceFn) {
  const filePath = path.join(projectRoot, relativePath);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = replaceFn(content);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`[OK] Patched ${relativePath}`);
  } catch (err) {
    console.error(`[ERROR] Failed to patch ${relativePath}:`, err.message);
  }
}

// 1. Patch src/app/login/actions.ts
patchFile('app/login/actions.ts', (content) => {
  return content
    .replace('import { redirect } from "next/navigation"', 'import { redirect } from "next/navigation"\nimport { getCurrentUser } from "@/utils/auth-service"\nimport { ROUTES } from "@/utils/routes"')
    .replace(
      /const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\)[\s\S]*redirect\("\/dashboard"\)/,
      `const user = await getCurrentUser()
  if (user) {
    revalidatePath("/", "layout")
    if (user.role === 'admin') {
      redirect(ROUTES.ADMIN_DASHBOARD)
    } else {
      redirect(ROUTES.USER_DASHBOARD)
    }
  }

  revalidatePath("/", "layout")
  redirect(ROUTES.USER_DASHBOARD)`
    );
});

// 2. Patch src/app/(user)/layout.tsx
patchFile('app/(user)/layout.tsx', (content) => {
  return content
    .replace('await requireUser()', 'const user = await requireUser()')
    .replace('<UserSidebar />', '<UserSidebar user={user} />')
    .replace('<UserTopbar />', '<UserTopbar user={user} />');
});

// 3. Patch src/app/admin/layout.tsx
patchFile('app/admin/layout.tsx', (content) => {
  return content
    .replace('await requireAdmin()', 'const user = await requireAdmin()')
    .replace('<AdminSidebar />', '<AdminSidebar user={user} />')
    .replace('<AdminTopbar />', '<AdminTopbar user={user} />');
});

// 4. Patch src/components/user-topbar.tsx
patchFile('components/user-topbar.tsx', (content) => {
  if (!content.includes('CurrentUser')) {
    content = content.replace('import { cn } from "@/lib/utils"', 'import { cn } from "@/lib/utils"\nimport { CurrentUser } from "@/utils/auth-service"\nimport { LogOut } from "lucide-react"');
  }
  content = content.replace('export function UserTopbar() {', 'export function UserTopbar({ user }: { user: CurrentUser }) {\n  const displayName = user.full_name || user.email\n  const initials = displayName.substring(0, 2).toUpperCase()');
  
  content = content.replace(
    /<DropdownMenuTrigger className=\{cn\(buttonVariants\(\{ variant: "ghost", size: "icon" \}\), "relative h-8 w-8 rounded-full"\)\}>[\s\S]*?<\/DropdownMenuTrigger>/,
    `<DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative h-8 w-8 rounded-full ring-2 ring-indigo-500 overflow-hidden")}>
            <Avatar className="h-8 w-8">
              {user.avatar_url ? <img src={user.avatar_url} alt={displayName} className="h-full w-full object-cover" /> : <AvatarFallback className="bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100">{initials}</AvatarFallback>}
            </Avatar>
          </DropdownMenuTrigger>`
  );

  content = content.replace(
    /<DropdownMenuContent align="end">[\s\S]*?<\/DropdownMenuContent>/,
    `<DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                {user.full_name && <p className="font-medium">{user.full_name}</p>}
                <p className="w-[200px] truncate text-sm text-slate-500">{user.email}</p>
                <div className="mt-1">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200 capitalize">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
            <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
            <form action="/api/logout" method="GET">
              <button type="submit" className="w-full">
                <DropdownMenuItem className="text-red-600 dark:text-red-400 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </button>
            </form>
          </DropdownMenuContent>`
  );
  return content;
});

// 5. Patch src/components/admin-sidebar.tsx
patchFile('components/admin-sidebar.tsx', (content) => {
  if (!content.includes('CurrentUser')) {
    content = content.replace('import { LayoutDashboard, Users, Server, FileText, Settings, Video, LogOut } from "lucide-react"', 'import { LayoutDashboard, Users, Server, FileText, Settings, Video, LogOut } from "lucide-react"\nimport { CurrentUser } from "@/utils/auth-service"\nimport { Avatar, AvatarFallback } from "./ui/avatar"');
  }
  content = content.replace('export function AdminSidebar() {', 'export function AdminSidebar({ user }: { user: CurrentUser }) {\n  const displayName = user?.full_name || user?.email || ""\n  const initials = displayName.substring(0, 2).toUpperCase()');

  // Replace the logout section with a richer profile summary and logout
  content = content.replace(
    /<div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">[\s\S]*?<\/div>\s*<\/div>/,
    `<div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="mb-4 flex items-center gap-3 px-2">
            <Avatar className="h-9 w-9 border">
              {user?.avatar_url ? <img src={user.avatar_url} alt={displayName} className="h-full w-full object-cover" /> : <AvatarFallback className="bg-slate-100 text-slate-900">{initials}</AvatarFallback>}
            </Avatar>
            <div className="flex flex-col truncate">
              <span className="text-sm font-medium truncate">{displayName}</span>
              <span className="text-xs text-slate-500 capitalize">{user?.role}</span>
            </div>
          </div>
          <form action="/api/logout" method="GET">
            <button
              type="submit"
              className="flex w-full items-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-400"
            >
              <LogOut className="h-5 w-5" />
              <span className="ml-3 font-medium">Log out</span>
            </button>
          </form>
        </div>
      </div>`
  );
  return content;
});

console.log("All patches applied.");
