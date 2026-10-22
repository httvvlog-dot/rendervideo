"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { Moon, Sun, Menu, Bell, Loader2 } from "lucide-react"
import { Button, buttonVariants } from "./ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase/client"

export function AdminTopbar({ user }: { user?: any }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const getInitials = (email: string) => {
    if (!email) return "AD";
    return email.substring(0, 2).toUpperCase();
  };
  const { setTheme } = useTheme()

  const handleSignOut = async () => {
    setIsLoggingOut(true)

    // Safety net: do not spin indefinitely if network or browser navigation hangs
    const timeoutId = setTimeout(() => {
      setIsLoggingOut(false)
      alert("Đăng xuất quá thời gian phản hồi do mạng chậm hoặc lỗi kết nối. Vui lòng thử lại.")
    }, 8000)

    try {
      const supabase = createClient()
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 4000))
      ])
    } catch (e) {
      console.warn("Client signOut warning:", e)
    }

    try {
      window.location.href = "/api/logout"
    } catch (e) {
      clearTimeout(timeoutId)
      setIsLoggingOut(false)
      alert("Không thể chuyển hướng đăng xuất. Vui lòng thử lại.")
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white/80 px-4 backdrop-blur-md sm:px-6 dark:bg-slate-950/80">
      <div className="flex items-center lg:hidden">
        <Button variant="ghost" size="icon" className="-ml-2">
          <Menu className="h-6 w-6" />
        </Button>
      </div>
      
      <div className="ml-auto flex items-center space-x-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
          </span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon" })}>
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="hidden md:flex flex-col items-end mr-2">
          <span className="text-sm font-medium leading-none">{user?.email || "Admin"}</span>
          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1 bg-blue-50 dark:bg-blue-900/30 px-1.5 rounded uppercase">{user?.role || "Admin"}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative h-8 w-8 rounded-full")}>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100">{getInitials(user?.email)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem 
              className="text-red-500 cursor-pointer flex items-center gap-2" 
              onClick={handleSignOut}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                  <span>Đang đăng xuất…</span>
                </>
              ) : (
                <span>Sign out</span>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLoggingOut && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl px-5 py-3.5 shadow-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Đang đăng xuất…</span>
          </div>
        </div>
      )}
    </header>
  )
}
