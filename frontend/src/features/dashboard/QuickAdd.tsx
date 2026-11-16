import { useRef, useState, type FormEvent } from 'react'
import { ChevronDown, Plus, Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { useQuickAdd } from '@/lib/queries'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Checkbox, Input, Label, Select } from '@/components/ui/input'
import { cn } from '@/lib/cn'
import { LegacyLink } from '@/components/legacy/LegacyLink'

export function QuickAdd({ large = false, autoFocus = false }: { large?: boolean; autoFocus?: boolean }) {
  const { bootstrap } = useAuth()
  const { t } = useI18n()
  const { toast } = useToast()
  const quickAdd = useQuickAdd()
  const [url, setUrl] = useState('')
  const [advanced, setAdvanced] = useState(large)
  const [processor, setProcessor] = useState('')
  const [tags, setTags] = useState('')
  const [paused, setPaused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!url.trim()) {
      inputRef.current?.focus()
      return
    }
    try {
      const watch = await quickAdd.mutateAsync({
        url: url.trim(),
        processor: processor || undefined,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        paused: paused || undefined,
      })
      toast(t('Watch added'), {
        description: watch.title || watch.url,
        tone: 'success',
      })
      setUrl('')
      setTags('')
      setPaused(false)
      if (!large) setAdvanced(false)
    } catch (error) {
      toast(t('Could not add this watch'), {
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  return (
    <form onSubmit={submit} className={cn('pulse-card p-3 md:p-4', large && 'md:p-5')} aria-label={t('Add a new watch')}>
      <div className={cn('flex flex-col gap-2', large ? 'md:flex-row' : 'sm:flex-row')}>
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            type="text"
            inputMode="url"
            placeholder={t('https://example.com/page-to-watch')}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            autoFocus={autoFocus}
            aria-label={t('Web page URL')}
            className={cn(large && 'h-12 text-base')}
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="primary"
            size={large ? 'lg' : 'md'}
            loading={quickAdd.isPending}
            className="flex-1 sm:flex-none"
          >
            <Plus className="h-4 w-4" />
            {t('Watch')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size={large ? 'lg' : 'md'}
            onClick={() => setAdvanced((value) => !value)}
            aria-expanded={advanced}
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', advanced && 'rotate-180')} />
            <span className={cn(!large && 'hidden md:inline')}>{t('Options')}</span>
          </Button>
        </div>
      </div>

      {advanced ? (
        <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="quick-add-processor">{t('Processor')}</Label>
            <Select
              id="quick-add-processor"
              value={processor}
              onChange={(event) => setProcessor(event.target.value)}
            >
              <option value="">{t('Default')}</option>
              {(bootstrap.processors || []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="quick-add-tags">{t('Groups')}</Label>
            <Input
              id="quick-add-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder={t('deals, electronics')}
            />
          </div>
          <Checkbox
            label={t('Add paused')}
            description={t('Save the watch without checking it yet.')}
            checked={paused}
            onChange={(event) => setPaused(event.target.checked)}
            className="sm:col-span-2"
          />
          {large ? (
            <div className="sm:col-span-2">
              <LegacyLink href="/add-watch-ui/">
                {t('Add with visual selector')}
              </LegacyLink>
              <p className="mt-1 text-xs text-muted">
                <Sparkles className="mr-1 inline h-3 w-3" />
                {t('The live visual selector remains in the classic interface for now.')}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  )
}
