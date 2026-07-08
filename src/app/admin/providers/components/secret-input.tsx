"use client"

import { useState } from "react"
import { Eye, EyeOff, Copy, RefreshCw, Check } from "lucide-react"

export function SecretInput({ 
  name, 
  defaultValue, 
  placeholder 
}: { 
  name: string, 
  defaultValue?: string, 
  placeholder?: string 
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [value, setValue] = useState(defaultValue || "")
  
  // If it's the masked value from server, it will be ••••••••••••••••
  const isMasked = value === "••••••••••••••••"

  const handleCopy = async () => {
    if (isMasked) return // Cannot copy masked value
    try {
      await navigator.clipboard.writeText(value)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {}
  }

  const handleRotate = () => {
    setValue("")
    setIsVisible(true) // Switch to text so they can paste
  }

  return (
    <div className="relative flex items-center">
      <input
        type={isVisible ? "text" : "password"}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        readOnly={isMasked}
        className={`w-full border rounded-lg px-4 py-2.5 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all pr-24 ${isMasked ? 'text-slate-400 font-mono tracking-widest' : ''}`}
      />
      <div className="absolute right-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setIsVisible(!isVisible)}
          disabled={isMasked}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50"
          title="Reveal"
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          disabled={isMasked || !value}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50"
          title="Copy"
        >
          {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>
        {isMasked && (
          <button
            type="button"
            onClick={handleRotate}
            className="p-1.5 text-blue-500 hover:text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-md"
            title="Rotate/Update Key"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
