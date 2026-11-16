import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const Dropdown = DropdownPrimitive.Root
export const DropdownTrigger = DropdownPrimitive.Trigger

export function DropdownContent({
  children,
  align = 'end',
  className,
}: {
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  className?: string
}) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        align={align}
        sideOffset={6}
        className={cn(
          'z-50 min-w-48 overflow-hidden rounded-card border border-border bg-surface p-1 shadow-xl',
          className,
        )}
      >
        {children}
      </DropdownPrimitive.Content>
    </DropdownPrimitive.Portal>
  )
}

export function DropdownItem({
  children,
  onSelect,
  destructive,
  disabled,
  checked,
  className,
}: {
  children: ReactNode
  onSelect?: () => void
  destructive?: boolean
  disabled?: boolean
  checked?: boolean
  className?: string
}) {
  return (
    <DropdownPrimitive.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        'flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-input px-2.5 py-2 text-sm outline-none',
        'data-[highlighted]:bg-surface-2',
        destructive ? 'text-danger' : 'text-fg',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      <span className="flex-1">{children}</span>
      {checked ? <Check className="h-4 w-4 text-primary" aria-hidden="true" /> : null}
    </DropdownPrimitive.Item>
  )
}

export function DropdownSeparator() {
  return <DropdownPrimitive.Separator className="my-1 h-px bg-border" />
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <DropdownPrimitive.Label className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
      {children}
    </DropdownPrimitive.Label>
  )
}
