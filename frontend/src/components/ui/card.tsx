import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('pulse-card', className)} {...props} />
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-start justify-between gap-3 px-4 pt-4 md:px-5 md:pt-5', className)} {...props} />
}

export function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <h2 className={cn('text-base font-semibold text-fg', className)}>{children}</h2>
}

export function CardDescription({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn('mt-1 text-sm text-muted', className)}>{children}</p>
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-4 py-4 md:px-5 md:py-5', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 md:px-5', className)} {...props} />
}
