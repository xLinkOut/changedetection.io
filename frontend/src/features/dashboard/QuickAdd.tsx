import { useRef, useState, type FormEvent } from 'react'
import { ChevronDown, Link2, Plus, Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { useQuickAdd } from '@/lib/queries'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Checkbox, Input, Label, Select, Textarea } from '@/components/ui/input'
import { cn } from '@/lib/cn'
import { LegacyLink } from '@/components/legacy/LegacyLink'

export function QuickAdd({
  large = false,
  autoFocus = false,
  hero = false,
}: {
  large?: boolean
  autoFocus?: boolean
  hero?: boolean
}) {
  const { bootstrap } = useAuth()
  const { t } = useI18n()
  const { toast } = useToast()
  const quickAdd = useQuickAdd()
  const [url, setUrl] = useState('')
  const [advanced, setAdvanced] = useState(large)
  const [processor, setProcessor] = useState('')
  const [tags, setTags] = useState('')
  const [llmIntent, setLlmIntent] = useState('')
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
        llm_intent: llmIntent.trim() || undefined,
      })
      toast(t('Watch added'), {
        description: watch.title || watch.url,
        tone: 'success',
      })
      setUrl('')
      setTags('')
      setLlmIntent('')
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
    <form
      onSubmit={submit}
      className={cn(
        hero
          ? 'rounded-[18px] border border-white/50 bg-surface/85 p-1.5 shadow-lg backdrop-blur-md dark:border-white/10'
          : 'pulse-card p-3 md:p-4',
        large && !hero && 'md:p-5',
      )}
      aria-label={t('Add a new watch')}
    >
      <div className={cn('flex flex-col gap-1.5', hero ? 'sm:flex-row' : 'sm:flex-row')}>
        <div className="relative flex-1">
          <Link2
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <Input
            ref={inputRef}
            type="text"
            inputMode="url"
            placeholder={t('Paste a URL to start watching…')}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            autoFocus={autoFocus}
            aria-label={t('Web page URL')}
            className={cn(
              'h-12 pl-9 text-[15px]',
              hero && 'border-transparent bg-transparent focus-visible:border-transparent focus-visible:bg-surface',
              large && !hero && 'h-12 text-base',
            )}
          />
        </div>
        <div className="flex gap-1.5">
          <Button
            type="submit"
            variant="primary"
            size={large || hero ? 'lg' : 'md'}
            loading={quickAdd.isPending}
            className="flex-1 sm:flex-none"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('Watch')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size={large || hero ? 'lg' : 'md'}
            onClick={() => setAdvanced((value) => !value)}
            aria-expanded={advanced}
            aria-label={t('Options')}
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', advanced && 'rotate-180')} />
            <span className={cn(!large && 'hidden md:inline')}>{t('Options')}</span>
          </Button>
        </div>
      </div>

      {advanced ? (
        <div
          className={cn(
            'mt-2 grid gap-3 border-t border-border pt-3 sm:grid-cols-2',
            hero && 'px-1.5 pb-1.5',
          )}
        >
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
          {bootstrap.features?.llm ? (
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="quick-add-llm-intent">{t('What matters — when to notify me')}</Label>
              <Textarea
                id="quick-add-llm-intent"
                value={llmIntent}
                onChange={(event) => setLlmIntent(event.target.value)}
                rows={3}
                placeholder={t(
                  'e.g. Notify me when products go in/out of stock, lead times change by more than a week, or new product variants appear. Skip review additions.',
                )}
              />
            </div>
          ) : null}
          <Checkbox
            label={t('Add paused')}
            description={t('Save the watch without checking it yet.')}
            checked={paused}
            onChange={(event) => setPaused(event.target.checked)}
            className="sm:col-span-2"
          />
          {large && !hero ? (
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
