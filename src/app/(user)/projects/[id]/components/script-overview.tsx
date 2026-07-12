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
    <Card className="mb-6 bg-slate-50 dark:bg-slate-900 border-indigo-100 dark:border-indigo-900">
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{title || "Untitled Project"}</h3>
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center text-slate-600 dark:text-slate-300">
            <Clock className="w-4 h-4 mr-2 text-indigo-500" />
            <span className="font-medium">{targetDuration}s</span>
            <span className="ml-1 text-slate-400">target duration</span>
          </div>
          <div className="flex items-center text-slate-600 dark:text-slate-300">
            <ListVideo className="w-4 h-4 mr-2 text-indigo-500" />
            <span className="font-medium">{sectionCount}</span>
            <span className="ml-1 text-slate-400">sections</span>
          </div>
          <div className="flex items-center text-slate-600 dark:text-slate-300">
            <Edit3 className="w-4 h-4 mr-2 text-indigo-500" />
            <span className="font-medium">{wordCount}</span>
            <span className="ml-1 text-slate-400">words</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
