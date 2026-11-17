import { useMemo } from 'react'
import type { RefObject } from 'react'
import type { DiffPart } from '@/lib/diff'
import { useI18n } from '@/lib/i18n'

interface Bucket {
  added: number
  removed: number
  context: number
}

function bucketise(parts: DiffPart[], count = 44): Bucket[] {
  const total = parts.reduce((sum, part) => {
    const lines = part.value.split('\n')
    return sum + (part.value.endsWith('\n') ? lines.length - 1 : lines.length)
  }, 0)
  if (!total) return []

  const perBucket = Math.max(1, Math.ceil(total / count))
  const buckets: Bucket[] = []
  let current: Bucket = { added: 0, removed: 0, context: 0 }
  let lines = 0

  for (const part of parts) {
    const partLines = part.value.split('\n')
    if (part.value.endsWith('\n')) partLines.pop()
    for (const _line of partLines) {
      if (part.added) current.added += 1
      else if (part.removed) current.removed += 1
      else current.context += 1
      lines += 1
      if (lines % perBucket === 0) {
        buckets.push(current)
        current = { added: 0, removed: 0, context: 0 }
      }
    }
  }
  if (current.added || current.removed || current.context) buckets.push(current)
  return buckets
}

/**
 * A GitHub-style change map for the current diff. One click jumps to that
 * region, which is faster than dragging a long phone-sized scrollbar and
 * impossible to get from a plain select. Desktop only; mobile keeps the
 * native scrollbar.
 */
export function DiffMinimap({
  parts,
  scrollRef,
}: {
  parts: DiffPart[]
  scrollRef: RefObject<HTMLDivElement | null>
}) {
  const { t } = useI18n()
  const buckets = useMemo(() => bucketise(parts), [parts])

  if (!buckets.length) return null

  const jump = (index: number) => {
    const node = scrollRef.current
    if (!node) return
    const ratio = (index + 0.5) / buckets.length
    node.scrollTo({
      top: Math.max(0, ratio * node.scrollHeight - node.clientHeight / 2),
      behavior: 'smooth',
    })
  }

  return (
    <aside
      className="sticky top-20 hidden w-12 shrink-0 flex-col items-center gap-2 border-l border-border bg-surface/60 py-3 lg:flex"
      aria-label={t('Diff map')}
    >
      <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-muted">{t('Map')}</span>
      <div className="flex h-[220px] w-6 flex-col gap-[2px] rounded-full bg-surface-2 p-[3px]">
        {buckets.map((bucket, index) => {
          const background =
            bucket.added && bucket.removed
              ? 'rgb(var(--warning))'
              : bucket.added
                ? 'rgb(var(--teal))'
                : bucket.removed
                  ? 'rgb(var(--danger))'
                  : 'rgb(var(--border-strong))'
          return (
            <button
              key={index}
              type="button"
              onClick={() => jump(index)}
              className="min-h-[2px] flex-1 rounded-full opacity-80 transition hover:opacity-100 hover:brightness-110"
              style={{ background }}
              title={t('Jump to this part of the diff')}
              aria-label={t('Jump to this part of the diff')}
            />
          )
        })}
      </div>
      <div className="flex flex-col items-center gap-1 text-[8px] text-muted" aria-hidden="true">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'rgb(var(--teal))' }} />
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'rgb(var(--danger))' }} />
      </div>
    </aside>
  )
}
