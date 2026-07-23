"use client"

import * as React from "react"
import { Info } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface InfoPopoverProps {
  title?: string
  description: React.ReactNode
}

export function InfoPopover({ title, description }: InfoPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger 
        className="inline-flex items-center justify-center rounded-full w-5 h-5 ml-1.5 text-muted-foreground hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        title={title || "Thông tin thêm"}
      >
        <Info className="w-3.5 h-3.5" />
        <span className="sr-only">Info</span>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm z-50">
        <div className="space-y-2">
          {title && <h4 className="font-semibold leading-none">{title}</h4>}
          <div className="text-muted-foreground">{description}</div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
