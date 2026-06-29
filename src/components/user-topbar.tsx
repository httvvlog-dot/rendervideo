"use client"

import { useTheme } from "next-themes"
import { Moon, Sun, Menu, Bell } from "lucide-react"
import { Button, buttonVariants } from "./ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"

export function UserTopbar() {
  const { setTheme } = useTheme()
  const [profile, setProfile] = useState<any>(null)
  
  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) setProfile(data)
      }
    }
    loadUser()
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white/80 px-4 backdrop-blur-md sm:px-6 dark:bg-slate-950/80">
      <div className="flex items-center lg:hidden">
        <Button variant="ghost" size="icon" className="-ml-2">
          <Menu className="h-6 w-6" />
        </Button>
        <span className="ml-2 text-lg font-bold">TaoVideo</span>
      </div>
      
      <div className="ml-auto flex items-center space-x-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
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

        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative h-8 w-8 rounded-full")}>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100">
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : (profile?.email ? profile.email.charAt(0).toUpperCase() : "U")}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                {profile?.full_name && <p className="font-medium">{profile.full_name}</p>}
                {profile?.email && <p className="w-[200px] truncate text-sm text-muted-foreground">{profile.email}</p>}
                <div className="mt-2 text-xs rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 w-fit">{profile?.role || "user"}</div>
              </div>
            </div>
            <DropdownMenuItem asChild><Link href="/profile">Profile</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/settings">Settings</Link></DropdownMenuItem>
            <DropdownMenuItem asChild className="text-red-500 cursor-pointer">
              <a href="/api/logout">Sign out</a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}