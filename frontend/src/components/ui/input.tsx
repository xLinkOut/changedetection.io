import { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export const inputClass =
  'min-h-11 w-full rounded-input border border-border-strong bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted ' +
  'focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ' +
  'disabled:cursor-not-allowed disabled:opacity-60'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(inputClass, className)} {...props} />,
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(inputClass, 'min-h-24 resize-y font-mono text-[13px]', className)} {...props} />
  ),
)
Textarea.displayName = 'Textarea'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(inputClass, 'pr-8', className)} {...props}>
      {children}
    </select>
  ),
)
Select.displayName = 'Select'

export function Label({ className, children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('block text-sm font-medium text-fg', className)} {...props}>
      {children}
    </label>
  )
}

export function HelpText({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('mt-1 text-xs leading-5 text-muted', className)}>{children}</p>
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="mt-1 text-xs font-medium text-danger">
      {children}
    </p>
  )
}

export function Field({
  label,
  htmlFor,
  help,
  error,
  children,
  className,
  required,
  aside,
}: {
  label: string
  htmlFor?: string
  help?: ReactNode
  error?: ReactNode
  children: ReactNode
  className?: string
  required?: boolean
  aside?: ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor}>
          {label}
          {required ? <span className="ml-0.5 text-danger" aria-hidden="true">*</span> : null}
        </Label>
        {aside}
      </div>
      {children}
      {help ? <HelpText>{help}</HelpText> : null}
      <FieldError>{error}</FieldError>
    </div>
  )
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }) {
  return (
    <label className={cn('flex min-h-11 cursor-pointer items-start gap-3 py-1.5', className)}>
      <input
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-border-strong text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        {...props}
      />
      <span>
        <span className="block text-sm font-medium text-fg">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
      </span>
    </label>
  )
}
