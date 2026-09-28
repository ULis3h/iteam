import { useId } from 'react'

/**
 * The iTeam mark: a blue tile with a fork-and-merge pipeline (one step fans out to two
 * parallel steps that merge again). Source: docs/images/logo.svg. The gradient id is
 * per-instance because the sidebar and the mobile header render the logo at the same time.
 */
export function Logo({ size = 28, title }: { size?: number; title?: string }) {
  const gradient = `iteam-logo-${useId().replace(/:/g, '')}`
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6190ff" />
          <stop offset="1" stopColor="#2d5be4" />
        </linearGradient>
      </defs>
      <path d="M328 0c64.41 0 96.61 0 121.21 12.53a115 115 0 0 1 50.26 50.26c12.53 24.6 12.53 56.8 12.53 121.21V328c0 64.41 0 96.61 -12.53 121.21a115 115 0 0 1 -50.26 50.26c-24.6 12.53 -56.8 12.53 -121.21 12.53H184c-64.41 0 -96.61 0 -121.21 -12.53a115 115 0 0 1 -50.26 -50.26c-12.53 -24.6 -12.53 -56.8 -12.53 -121.21V184c0 -64.41 0 -96.61 12.53 -121.21a115 115 0 0 1 50.26 -50.26c24.6 -12.53 56.8 -12.53 121.21 -12.53Z" fill={`url(#${gradient})`} />
      <path d="M144.54 201.66A10 10 0 0 0 154.03 199.03L192.03 161.03A10 10 0 0 0 194.66 151.54A56 56 0 1 1 304.98 139.55A10 10 0 0 0 309.59 148.25L442.54 233.25A27 27 0 0 1 442.54 278.75L309.59 363.75A10 10 0 0 0 304.98 372.45A56 56 0 1 1 194.66 360.46A10 10 0 0 0 192.03 350.97L154.03 312.97A10 10 0 0 0 144.54 310.34A56 56 0 1 1 144.54 201.66ZM264.39 176.89A18 18 0 0 0 241.75 179.19L177.67 243.27A18 18 0 0 0 177.67 268.73L241.75 332.81A18 18 0 0 0 264.39 335.11L361.6 271.03A18 18 0 0 0 361.6 240.97Z" fill="#fff" fillRule="evenodd" />
    </svg>
  )
}
