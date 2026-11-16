import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownTrigger } from '@/components/ui/dropdown'
import { Button } from '@/components/ui/button'
import type { ThemePreference } from '@/lib/types'

export function ThemeToggle() {
  const { preference, resolved, setPreference } = useTheme()
  const { t } = useI18n()

  const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: t('Light'), icon: Sun },
    { value: 'dark', label: t('Dark'), icon: Moon },
    { value: 'system', label: t('System'), icon: Monitor },
  ]
  const ActiveIcon = preference === 'system' ? Monitor : resolved === 'dark' ? Moon : Sun

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('Theme')}>
          <ActiveIcon className="h-5 w-5" aria-hidden="true" />
        </Button>
      </DropdownTrigger>
      <DropdownContent>
        <DropdownLabel>{t('Theme')}</DropdownLabel>
        {options.map((option) => (
          <DropdownItem
            key={option.value}
            checked={preference === option.value}
            onSelect={() => setPreference(option.value)}
          >
            <option.icon className="mr-2 inline h-4 w-4" aria-hidden="true" />
            {option.label}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  )
}
