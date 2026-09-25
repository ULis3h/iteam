export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7aa2ff" />
          <stop offset="0.5" stopColor="#b48cff" />
          <stop offset="1" stopColor="#ffb08a" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="52" height="52" rx="16" fill="url(#logo-g)" />
      <circle cx="22" cy="24" r="6" fill="#fff" />
      <circle cx="42" cy="24" r="6" fill="#fff" />
      <circle cx="32" cy="42" r="6" fill="#fff" />
      <path d="M22 24 L32 42 L42 24" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}
