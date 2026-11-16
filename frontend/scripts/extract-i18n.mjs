#!/usr/bin/env node
/**
 * Extract the English source strings used by Pulse.
 *
 * The catalogs remain the existing Babel `.po` files; this script is a
 * development aid that lists every `t('…')` / `tn('…', '…')` string so new
 * strings can be merged into the Italian catalog without touching the UI code
 * in another place.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const src = join(root, 'src')

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const strings = new Set()
const plurals = new Map()
const call = /\btn?\(\s*(['"])((?:\\.|(?!\1).)*)\1(?:\s*,\s*(['"])((?:\\.|(?!\3).)*)\3)?/g

for (const file of walk(src)) {
  if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue
  const source = readFileSync(file, 'utf8')
  let match
  while ((match = call.exec(source))) {
    const singular = match[2]
    const plural = match[4]
    if (plural) {
      plurals.set(singular, plural)
    } else {
      strings.add(singular)
    }
  }
}

const output = {
  source: 'frontend',
  generatedAt: new Date().toISOString(),
  strings: [...strings].sort(),
  plurals: [...plurals.entries()].map(([singular, plural]) => ({ singular, plural })),
}

writeFileSync(join(root, 'i18n-strings.json'), JSON.stringify(output, null, 2) + '\n')
console.log(
  `Wrote ${output.strings.length} strings and ${output.plurals.length} plural pairs to frontend/i18n-strings.json`,
)
