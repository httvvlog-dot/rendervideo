"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Clock, ListVideo, Edit3 } from "lucide-react"

interface ScriptOverviewProps {
  title: string;
  targetDuration: number;
  sectionCount: number;
  wordCount: number;
}

export function ScriptOverview({ title, targetDuration, sectionCount, wordCount }: ScriptOverviewProps) {
  return (
    <Card className="mb-6 bg-slate-50 dark:bg-slate-900 border-indigo-100 dark:border-indigo-900 border-0 shadow-none sm:border sm:shadow-sm">
      <CardContent className="p-0 sm:p-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2 sm:mb-4">{title || "Untitled Project"}</h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:gap-6 text-sm text-slate-600 dark:text-slate-300">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1 sm:mr-2 text-indigo-500 shrink-0" />
            <span className="font-medium">{targetDuration}s</span>
            <span className="ml-1 text-slate-400 hidden sm:inline">target duration</span>
          </div>
          <span className="text-slate-300 dark:text-slate-600 sm:hidden">•</span>
          <div className="flex items-center">
            <ListVideo className="w-4 h-4 mr-1 sm:mr-2 text-indigo-500 shrink-0" />
            <span className="font-medium">{sectionCount}</span>
            <span className="ml-1 text-slate-400 hidden sm:inline">sections</span>
            <span className="ml-1 sm:hidden">sections</span>
          </div>
          <span className="text-slate-300 dark:text-slate-600 sm:hidden">•</span>
          <div className="flex items-center">
            <Edit3 className="w-4 h-4 mr-1 sm:mr-2 text-indigo-500 shrink-0" />
            <span className="font-medium">{wordCount}</span>
            <span className="ml-1 text-slate-400 hidden sm:inline">words</span>
            <span className="ml-1 sm:hidden">words</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
