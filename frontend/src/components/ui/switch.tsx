import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '@/lib/cn'

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  id,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  id?: string
}) {
  const control = (
    <SwitchPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        checked ? 'bg-primary' : 'bg-border-strong',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </SwitchPrimitive.Root>
  )

  if (!label) return control

  return (
    <label className="flex min-h-11 cursor-pointer items-start justify-between gap-4 py-1.5">
      <span>
        <span className="block text-sm font-medium text-fg">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
      </span>
      {control}
    </label>
  )
}
