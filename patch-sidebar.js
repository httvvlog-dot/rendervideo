const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'admin-sidebar.tsx');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(
    /import \{ LayoutDashboard, Users, Server, FileText, Settings, Video \} from "lucide-react"/,
    'import { LayoutDashboard, Users, Server, FileText, Settings, Video, LogOut } from "lucide-react"'
  );
  
  const insertIndex = content.lastIndexOf('</ul>');
  if (insertIndex !== -1) {
    const stringToInsert = `
        <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">
          <form action="/api/logout" method="GET">
            <button
              type="submit"
              className="flex w-full items-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <LogOut className="h-5 w-5" />
              <span className="ml-3 font-medium">Log out</span>
            </button>
          </form>
        </div>
`;
    content = content.substring(0, insertIndex + 5) + stringToInsert + content.substring(insertIndex + 5);
    
    fs.writeFileSync(filePath, content);
    console.log("Successfully patched admin-sidebar.tsx");
  } else {
    console.log("Could not find </ul> tag");
  }
} catch (e) {
  console.error("Error patching file:", e);
}
