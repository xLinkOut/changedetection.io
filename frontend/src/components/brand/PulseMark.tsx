import { cn } from '@/lib/cn'

/**
 * The Pulse mark: a pulse trace on the brand gradient. The trace animates
 * only on request (login and empty states) so idle chrome stays quiet.
 */
export function PulseMark({
  className,
  animated = false,
  glow = false,
}: {
  className?: string
  animated?: boolean
  glow?: boolean
}) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[13px] signal-gradient text-white',
        glow && 'shadow-glow',
        className || 'h-8 w-8',
      )}
      aria-hidden="true"
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-white/20" />
      <svg
        viewBox="0 0 32 32"
        fill="none"
        className="relative h-[62%] w-[62%]"
        role="presentation"
      >
        <path
          d="M3 17h5.2l2.4-6.4 4.3 12.6 3.2-8.2 1.8 4.1H29"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animated ? 'pulse-trace' : undefined}
        />
      </svg>
      {animated ? (
        <span className="pointer-events-none absolute inset-0 rounded-[13px] ring-1 ring-inset ring-white/25" />
      ) : null}
    </span>
  )
}

export function PulseWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <PulseMark />
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[15px] font-semibold tracking-[-0.02em]">Pulse</span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
            changedetection.io
          </span>
        </span>
      ) : null}
    </span>
  )
}
