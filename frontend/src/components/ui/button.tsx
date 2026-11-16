import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-contrast hover:bg-primary-hover border border-transparent',
  secondary:
    'bg-surface text-fg border border-border-strong hover:bg-surface-2',
  ghost:
    'bg-transparent text-fg border border-transparent hover:bg-surface-2',
  danger:
    'bg-danger text-white border border-transparent hover:opacity-90',
  subtle:
    'bg-surface-2 text-fg border border-transparent hover:bg-border',
}

const sizes: Record<Size, string> = {
  sm: 'h-11 px-3 text-sm gap-1.5 rounded-input',
  md: 'h-11 px-4 text-sm gap-2 rounded-input',
  lg: 'h-12 px-5 text-base gap-2 rounded-input',
  icon: 'h-11 w-11 justify-center rounded-input',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex select-none items-center justify-center font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
