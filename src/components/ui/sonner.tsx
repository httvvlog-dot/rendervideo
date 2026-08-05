"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-white dark:group-[.toaster]:bg-slate-950 group-[.toaster]:text-slate-950 dark:group-[.toaster]:text-slate-50 group-[.toaster]:border-slate-200 dark:group-[.toaster]:border-slate-800 group-[.toaster]:shadow-lg rounded-xl overflow-hidden px-4 py-3 mx-4 sm:mx-0 font-sans",
          description: "group-[.toast]:text-slate-500 dark:group-[.toast]:text-slate-400 text-xs sm:text-sm",
          actionButton: "group-[.toast]:bg-indigo-600 group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-500 dark:group-[.toast]:bg-slate-800 dark:group-[.toast]:text-slate-400",
          success: "group-[.toaster]:border-emerald-500/30 group-[.toaster]:bg-emerald-50/80 dark:group-[.toaster]:bg-emerald-950/40 group-[.toaster]:text-emerald-700 dark:group-[.toaster]:text-emerald-400",
          error: "group-[.toaster]:border-rose-500/30 group-[.toaster]:bg-rose-50/80 dark:group-[.toaster]:bg-rose-950/40 group-[.toaster]:text-rose-700 dark:group-[.toaster]:text-rose-400",
          warning: "group-[.toaster]:border-amber-500/30 group-[.toaster]:bg-amber-50/80 dark:group-[.toaster]:bg-amber-950/40 group-[.toaster]:text-amber-700 dark:group-[.toaster]:text-amber-400",
          info: "group-[.toaster]:border-indigo-500/30 group-[.toaster]:bg-indigo-50/80 dark:group-[.toaster]:bg-indigo-950/40 group-[.toaster]:text-indigo-700 dark:group-[.toaster]:text-indigo-400",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
