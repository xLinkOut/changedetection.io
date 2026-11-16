import { useState } from 'react'
import { Check, Languages } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownTrigger } from '@/components/ui/dropdown'

export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const { languages, locale, setLocale } = useI18n()
  const { refresh } = useAuth()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  if (languages.length < 2) return null

  async function choose(code: string) {
    if (code === locale || busy) return
    setBusy(true)
    try {
      await setLocale(code)
      await refresh()
    } catch {
      toast('Could not change language', { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? 'icon' : 'md'}
          aria-label="Language"
          disabled={busy}
        >
          <Languages className="h-5 w-5" aria-hidden="true" />
          {!compact ? (
            <span className="hidden text-sm md:inline">
              {languages.find((language) => language.code === locale)?.name || locale}
            </span>
          ) : null}
        </Button>
      </DropdownTrigger>
      <DropdownContent>
        <DropdownLabel>Language</DropdownLabel>
        {languages.map((language) => (
          <DropdownItem
            key={language.code}
            checked={language.code === locale}
            onSelect={() => choose(language.code)}
          >
            {language.name}
            {language.code === locale ? <Check className="ml-2 inline h-4 w-4" aria-hidden="true" /> : null}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  )
}
