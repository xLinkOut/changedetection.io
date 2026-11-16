import { diffChars, diffLines, diffWordsWithSpace, type Change } from 'diff'

export type DiffMode = 'lines' | 'words' | 'chars'

export interface DiffOptions {
  mode: DiffMode
  ignoreWhitespace: boolean
  changesOnly: boolean
  showAdded: boolean
  showRemoved: boolean
}

export interface DiffPart {
  value: string
  added?: boolean
  removed?: boolean
}

export interface DiffStats {
  added: number
  removed: number
  changed: number
}

const MAX_INLINE_CHARS = 120_000

function normalise(text: string, ignoreWhitespace: boolean): string {
  if (!ignoreWhitespace) return text
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
}

export function computeDiff(
  before: string,
  after: string,
  options: DiffOptions,
): { parts: DiffPart[]; stats: DiffStats; truncated: boolean } {
  const oldText = normalise(before, options.ignoreWhitespace)
  const newText = normalise(after, options.ignoreWhitespace)

  let mode = options.mode
  let truncated = false
  if (mode !== 'lines' && (oldText.length > MAX_INLINE_CHARS || newText.length > MAX_INLINE_CHARS)) {
    mode = 'lines'
    truncated = true
  }

  let changes: Change[]
  if (mode === 'lines') {
    changes = diffLines(oldText, newText, { newlineIsToken: false })
  } else if (mode === 'words') {
    changes = diffWordsWithSpace(oldText, newText)
  } else {
    changes = diffChars(oldText, newText)
  }

  let added = 0
  let removed = 0
  let changed = 0
  const parts: DiffPart[] = []

  for (const change of changes) {
    if (change.added) {
      if (!options.showAdded) continue
      added += countLines(change.value)
    } else if (change.removed) {
      if (!options.showRemoved) continue
      removed += countLines(change.value)
    } else if (options.changesOnly) {
      continue
    }

    if (change.added || change.removed) changed += 1
    parts.push({ value: change.value, added: change.added, removed: change.removed })
  }

  return { parts, stats: { added, removed, changed }, truncated }
}

function countLines(value: string): number {
  if (!value) return 0
  const lines = value.split('\n')
  return value.endsWith('\n') ? lines.length - 1 : lines.length
}

export interface SideBySideRow {
  leftNumber?: number
  rightNumber?: number
  left?: string
  right?: string
  type: 'context' | 'removed' | 'added' | 'changed'
}

/** Pair removed/added blocks into rows for a readable side-by-side diff. */
export function buildSideBySide(parts: DiffPart[]): SideBySideRow[] {
  const rows: SideBySideRow[] = []
  let leftNumber = 1
  let rightNumber = 1
  let pendingRemoved: string[] = []

  const flushRemoved = () => {
    for (const line of pendingRemoved) {
      rows.push({ leftNumber: leftNumber++, left: line, type: 'removed' })
    }
    pendingRemoved = []
  }

  for (const part of parts) {
    const lines = splitLines(part.value)
    if (part.removed) {
      pendingRemoved.push(...lines)
      continue
    }
    if (part.added) {
      const max = Math.max(pendingRemoved.length, lines.length)
      for (let index = 0; index < max; index += 1) {
        const left = pendingRemoved[index]
        const right = lines[index]
        rows.push({
          leftNumber: left !== undefined ? leftNumber++ : undefined,
          rightNumber: right !== undefined ? rightNumber++ : undefined,
          left,
          right,
          type: left !== undefined && right !== undefined ? 'changed' : right !== undefined ? 'added' : 'removed',
        })
      }
      pendingRemoved = []
      continue
    }

    flushRemoved()
    for (const line of lines) {
      rows.push({
        leftNumber: leftNumber++,
        rightNumber: rightNumber++,
        left: line,
        right: line,
        type: 'context',
      })
    }
  }

  flushRemoved()
  return rows
}

function splitLines(value: string): string[] {
  if (!value) return []
  const lines = value.split('\n')
  if (value.endsWith('\n')) lines.pop()
  return lines
}
