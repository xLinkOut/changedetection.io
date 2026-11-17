import type { DiffPart, SideBySideRow } from '@/lib/diff'
import { buildSideBySide, type DiffMode } from '@/lib/diff'
import { cn } from '@/lib/cn'

function splitLines(value: string): string[] {
  if (!value) return []
  const lines = value.split('\n')
  if (value.endsWith('\n')) lines.pop()
  return lines
}

function UnifiedLines({ parts }: { parts: DiffPart[] }) {
  let oldNumber = 1
  let newNumber = 1
  const rows: { oldNo?: number; newNo?: number; sign: string; text: string; kind: string }[] = []

  for (const part of parts) {
    for (const line of splitLines(part.value)) {
      if (part.added) {
        rows.push({ newNo: newNumber++, sign: '+', text: line, kind: 'added' })
      } else if (part.removed) {
        rows.push({ oldNo: oldNumber++, sign: '-', text: line, kind: 'removed' })
      } else {
        rows.push({ oldNo: oldNumber++, newNo: newNumber++, sign: ' ', text: line, kind: 'context' })
      }
    }
  }

  return (
    <div role="document" aria-label="Text differences" className="min-w-0 divide-y divide-border/60">
      {rows.map((row, index) => (
        <div
          key={index}
          className={cn(
            'flex items-start',
            row.kind === 'added' && 'diff-line-added',
            row.kind === 'removed' && 'diff-line-removed',
          )}
        >
          <span className="w-10 shrink-0 select-none border-r border-border/60 px-1 text-right font-mono text-[11px] leading-5 text-muted/70">
            {row.oldNo ?? ''}
          </span>
          <span className="w-10 shrink-0 select-none border-r border-border/60 px-1 text-right font-mono text-[11px] leading-5 text-muted/70">
            {row.newNo ?? ''}
          </span>
          <span className="w-5 shrink-0 select-none text-center font-mono text-[13px] leading-5 opacity-70">{row.sign}</span>
          <span className="diff-line min-w-0 flex-1 px-2">{row.text || ' '}</span>
          <span className="sr-only">
            {row.kind === 'added' ? 'added line' : row.kind === 'removed' ? 'removed line' : 'unchanged line'}
          </span>
        </div>
      ))}
    </div>
  )
}

function InlineDiff({ parts }: { parts: DiffPart[] }) {
  return (
    <pre
      role="document"
      aria-label="Text differences"
      className="whitespace-pre-wrap break-words p-3 font-mono text-[13px] leading-5"
      style={{ fontVariantLigatures: 'none' }}
    >
      {parts.map((part, index) => (
        <span
          key={index}
          className={cn(
            part.added && 'rounded-sm bg-diff-added-bg text-diff-added-text',
            part.removed && 'rounded-sm bg-diff-removed-bg text-diff-removed-text line-through decoration-1',
          )}
        >
          {part.value}
        </span>
      ))}
    </pre>
  )
}

function SplitView({ rows }: { rows: SideBySideRow[] }) {
  return (
    <div role="document" aria-label="Side-by-side text differences" className="min-w-0">
      <div className="grid grid-cols-2 border-b border-border bg-surface-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <div className="border-r border-border px-3 py-1.5">Before</div>
        <div className="px-3 py-1.5">After</div>
      </div>
      <div>
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-2 border-b border-border/50 last:border-0">
            <div
              className={cn(
                'flex min-w-0 border-r border-border/60',
                row.type === 'removed' || row.type === 'changed' ? 'bg-diff-removed-bg' : '',
              )}
            >
              <span className="w-10 shrink-0 select-none px-1 text-right font-mono text-[11px] leading-5 text-muted/70">
                {row.leftNumber ?? ''}
              </span>
              <span
                className={cn(
                  'diff-line min-w-0 flex-1 px-2',
                  row.type === 'removed' || row.type === 'changed' ? 'text-diff-removed-text' : '',
                )}
              >
                {row.left ?? ' '}
              </span>
            </div>
            <div className={cn('flex min-w-0', row.type === 'added' || row.type === 'changed' ? 'bg-diff-added-bg' : '')}>
              <span className="w-10 shrink-0 select-none px-1 text-right font-mono text-[11px] leading-5 text-muted/70">
                {row.rightNumber ?? ''}
              </span>
              <span
                className={cn(
                  'diff-line min-w-0 flex-1 px-2',
                  row.type === 'added' || row.type === 'changed' ? 'text-diff-added-text' : '',
                )}
              >
                {row.right ?? ' '}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DiffViewer({
  parts,
  mode,
  view,
}: {
  parts: DiffPart[]
  mode: DiffMode
  view: 'unified' | 'split'
}) {
  if (!parts.length) {
    return (
      <div className="p-6 text-center text-sm text-muted">No differences to show with the current filters.</div>
    )
  }

  if (mode === 'lines') {
    if (view === 'split') {
      return <SplitView rows={buildSideBySide(parts)} />
    }
    return <UnifiedLines parts={parts} />
  }

  return <InlineDiff parts={parts} />
}
