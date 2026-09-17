import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 22, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
    ...rest,
  }
}

export function HelpIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9.4 9.3a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.2-2.6 3.8" />
      <circle cx="12" cy="17.4" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function StatsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </svg>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </svg>
  )
}

export function BackspaceIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 6H8l-5 6 5 6h13a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1z" />
      <path d="M12 9l6 6M18 9l-6 6" />
    </svg>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}

export function ShuffleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M16 4h4v4" />
      <path d="M4 20L20 4" />
      <path d="M16 20h4v-4" />
      <path d="M14 14l6 6" />
      <path d="M4 4l5 5" />
    </svg>
  )
}

export function ShareIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3v12" />
      <path d="M7.5 7.5L12 3l4.5 4.5" />
      <path d="M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" />
    </svg>
  )
}

export function GlobeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M2.5 12h19M12 2.5c3 3.2 3 15.8 0 19M12 2.5c-3 3.2-3 15.8 0 19" />
    </svg>
  )
}

export function BookIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 5.5A2 2 0 0 1 6 3.5h5.5a1 1 0 0 1 1 1V20a1 1 0 0 0-1-1H6a2 2 0 0 0-2 2z" />
      <path d="M20 5.5A2 2 0 0 0 18 3.5h-5.5a1 1 0 0 0-1 1V20a1 1 0 0 1 1-1H18a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export function FlagIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 21V4" />
      <path d="M5 4.5c2-1.3 4-1.3 6 0s4 1.3 6 0v9c-2 1.3-4 1.3-6 0s-4-1.3-6 0z" />
    </svg>
  )
}

export function LandmarkIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 21h18" />
      <path d="M4 21V10M9 21V10M15 21V10M20 21V10" />
      <path d="M2 10l10-6 10 6z" />
    </svg>
  )
}

export function CoinIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7.5v9M9.5 9.3a2.6 2.6 0 0 1 2.5-1.5c1.6 0 2.7.8 2.7 2s-1.1 1.8-2.7 2-2.7.8-2.7 2 1.1 2 2.7 2a2.7 2.7 0 0 0 2.5-1.4" />
    </svg>
  )
}

export function ChatIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 5.5h16v11H9.5L5 20v-3.5H4z" />
      <path d="M8 9.5h8M8 12.5h5" />
    </svg>
  )
}

export function LightbulbIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3a6.5 6.5 0 0 0-3.6 11.9c.7.5 1.1 1.3 1.1 2.1h5c0-.8.4-1.6 1.1-2.1A6.5 6.5 0 0 0 12 3z" />
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 12.5l5 5 10-11" />
    </svg>
  )
}
