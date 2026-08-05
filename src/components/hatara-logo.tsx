import React from "react"

export function HataraLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="hatara-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#9333EA" />
        </linearGradient>
      </defs>
      <path 
        d="M8 24V8M24 24V8M8 16h16" 
        stroke="url(#hatara-grad)" 
        strokeWidth="5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  )
}
