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
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="33%" stopColor="#D946EF" />
          <stop offset="66%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <filter id="hatara-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
        </filter>
      </defs>
      <g filter="url(#hatara-shadow)">
        <rect x="5" y="4" width="7" height="24" rx="3.5" fill="url(#hatara-grad)" />
        <rect x="20" y="4" width="7" height="24" rx="3.5" fill="url(#hatara-grad)" />
        <rect x="8.5" y="12.5" width="15" height="7" rx="3.5" fill="url(#hatara-grad)" transform="rotate(-15 16 16)" opacity="0.95" />
      </g>
    </svg>
  )
}
