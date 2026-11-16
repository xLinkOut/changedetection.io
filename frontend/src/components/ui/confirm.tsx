import { useState, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogClose } from './dialog'
import { Button } from './button'
import { Input } from './input'

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
  busy = false,
  children,
  requireText,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
  busy?: boolean
  children?: ReactNode
  requireText?: string
}) {
  const [typed, setTyped] = useState('')
  const blocked = Boolean(requireText) && typed.trim().toLowerCase() !== requireText!.toLowerCase()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={typeof description === 'string' ? description : undefined}>
        {typeof description !== 'string' ? <div className="text-sm text-muted">{description}</div> : null}
        {children}
        {requireText ? (
          <div className="mt-4">
            <p className="mb-1 text-sm text-muted">
              Type <strong className="text-fg">{requireText}</strong> to confirm.
            </p>
            <Input value={typed} onChange={(event) => setTyped(event.target.value)} autoFocus />
          </div>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            loading={busy}
            disabled={blocked}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
