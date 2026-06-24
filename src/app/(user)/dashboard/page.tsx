"use client"

import { motion } from "framer-motion"
import { Plus, PlaySquare } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function UserDashboard() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-2">
            Welcome back! Manage your video generation projects here.
          </p>
        </div>
      </div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/50"
      >
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 mb-6">
            <PlaySquare className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50">No projects created</h3>
          <p className="mb-8 mt-3 text-sm text-slate-500 dark:text-slate-400">
            You haven't generated any videos yet. Start your first project to experience the power of automated AI video generation.
          </p>
          <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8">
            <Plus className="mr-2 h-5 w-5" />
            Create First Project
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
