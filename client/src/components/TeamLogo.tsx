interface TeamLogoProps {
  className?: string
}

export default function TeamLogo({ className = 'h-8 w-8' }: TeamLogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 中心的"1"代表一个人 */}
      <g className="origin-center animate-pulse">
        <circle cx="50" cy="50" r="18" fill="currentColor" opacity="0.3" />
        <text
          x="50"
          y="58"
          fontSize="28"
          fontWeight="bold"
          fill="currentColor"
          textAnchor="middle"
          className="font-mono"
        >
          1
        </text>
      </g>

      {/* 周围的设备/团队成员节点 */}
      {/* 上方设备 */}
      <g className="animate-float" style={{ animationDelay: '0s' }}>
        <circle cx="50" cy="15" r="8" fill="currentColor" opacity="0.8" />
        <rect x="46" y="11" width="8" height="8" rx="2" fill="white" opacity="0.9" />
      </g>

      {/* 右上设备 */}
      <g className="animate-float" style={{ animationDelay: '0.3s' }}>
        <circle cx="78" cy="28" r="8" fill="currentColor" opacity="0.8" />
        <rect x="74" y="24" width="8" height="8" rx="2" fill="white" opacity="0.9" />
      </g>

      {/* 右下设备 */}
      <g className="animate-float" style={{ animationDelay: '0.6s' }}>
        <circle cx="78" cy="72" r="8" fill="currentColor" opacity="0.8" />
        <rect x="74" y="68" width="8" height="8" rx="2" fill="white" opacity="0.9" />
      </g>

      {/* 下方设备 */}
      <g className="animate-float" style={{ animationDelay: '0.9s' }}>
        <circle cx="50" cy="85" r="8" fill="currentColor" opacity="0.8" />
        <rect x="46" y="81" width="8" height="8" rx="2" fill="white" opacity="0.9" />
      </g>

      {/* 左下设备 */}
      <g className="animate-float" style={{ animationDelay: '1.2s' }}>
        <circle cx="22" cy="72" r="8" fill="currentColor" opacity="0.8" />
        <rect x="18" y="68" width="8" height="8" rx="2" fill="white" opacity="0.9" />
      </g>

      {/* 左上设备 */}
      <g className="animate-float" style={{ animationDelay: '1.5s' }}>
        <circle cx="22" cy="28" r="8" fill="currentColor" opacity="0.8" />
        <rect x="18" y="24" width="8" height="8" rx="2" fill="white" opacity="0.9" />
      </g>

      {/* 连接线 - 从中心到各个节点 */}
      <g opacity="0.4" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2">
        <line x1="50" y1="32" x2="50" y2="23" className="animate-pulse" />
        <line x1="64" y1="36" x2="72" y2="32" className="animate-pulse" style={{ animationDelay: '0.3s' }} />
        <line x1="64" y1="64" x2="72" y2="68" className="animate-pulse" style={{ animationDelay: '0.6s' }} />
        <line x1="50" y1="68" x2="50" y2="77" className="animate-pulse" style={{ animationDelay: '0.9s' }} />
        <line x1="36" y1="64" x2="28" y2="68" className="animate-pulse" style={{ animationDelay: '1.2s' }} />
        <line x1="36" y1="36" x2="28" y2="32" className="animate-pulse" style={{ animationDelay: '1.5s' }} />
      </g>

      {/* 外围轨道圆 */}
      <circle
        cx="50"
        cy="50"
        r="42"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="6 4"
        opacity="0.2"
        className="animate-spin"
        style={{ animationDuration: '20s' }}
      />
    </svg>
  )
}
