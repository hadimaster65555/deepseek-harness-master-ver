/** FileTypeIcon's default per-category palette as CSS text. */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { CodeFileType, FileType } from '@master-harness/client-ui-primitives'

const css = readFileSync(fileURLToPath(new URL('../src/FileTypeIcon.module.css', import.meta.url)), 'utf8')

type TraditionalFileType = Exclude<FileType, CodeFileType>

const TYPE_COLORS: Readonly<Record<TraditionalFileType, string>> = {
  code: 'var(--mh-static-deepseek-500)',
  excel: 'var(--mh-static-green-500)',
  folder: 'var(--mh-static-amber-400)',
  html: 'var(--mh-static-deepseek-500)',
  image: 'var(--mh-file-type-violet)',
  markdown: 'var(--mh-static-deepseek-500)',
  other: 'var(--mh-static-neutral-bluish-300)',
  pdf: 'var(--mh-static-red-600)',
  ppt: 'var(--mh-static-amber-500)',
  video: 'var(--mh-file-type-violet)',
  word: 'var(--mh-static-deepseek-450)',
}

describe('FileTypeIcon.module.css', () => {
  it.each(Object.entries(TYPE_COLORS) as [TraditionalFileType, string][])(
    '%s has its own default color',
    (type, color) => {
      const rule = css.match(new RegExp(`\\.${type}\\s*\\{([^}]*)\\}`))?.[1]
      expect(rule).toContain(`--mh-file-type-default-color: ${color}`)
    },
  )

  it('keeps one caller override and the supplied violet in named variables', () => {
    expect(css).toContain('color: var(--mh-file-type-icon-color, var(--mh-file-type-default-color))')
    expect(css).toContain('--mh-file-type-violet: rgb(139, 118, 246)')
  })
})
