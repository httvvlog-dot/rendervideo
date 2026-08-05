import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
 
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'
 
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <svg 
          viewBox="0 0 32 32" 
          width="32"
          height="32"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="hatara-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="33%" stopColor="#D946EF" />
              <stop offset="66%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
          <g>
            <rect x="5" y="4" width="7" height="24" rx="3.5" fill="url(#hatara-grad)" />
            <rect x="20" y="4" width="7" height="24" rx="3.5" fill="url(#hatara-grad)" />
            <rect x="8.5" y="12.5" width="15" height="7" rx="3.5" fill="url(#hatara-grad)" transform="rotate(-15 16 16)" opacity="0.95" />
          </g>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
