import { useQuery } from '@tanstack/react-query'
import { ArrowDownRight, ArrowUpRight, LineChart } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { formatDateTime, formatPrice } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { EmptyState, Skeleton } from '@/components/ui/states'
import { useAuth } from '@/lib/auth'

interface PricePoint {
  timestamp: number
  price: number | null
  in_stock: boolean | null
}

interface PriceData {
  series: PricePoint[]
  currency: string
  summary: {
    count: number
    min: number
    max: number
    avg: number
    median: number
    current: number
    status: 'low' | 'high' | 'typical'
    all_time_low: boolean
    cheaper_than_pct: number
    pricier_than_pct: number
  } | null
}

export function PriceTab({ uuid }: { uuid: string }) {
  const { t, locale } = useI18n()
  const { bootstrap } = useAuth()
  const query = useQuery({
    queryKey: ['processor-data', uuid],
    queryFn: () => apiFetch<PriceData>(`/watches/${uuid}/processor-data`),
    retry: false,
  })

  if (!bootstrap.features?.restock) {
    return (
      <EmptyState
        icon={LineChart}
        title={t('Price tracking is not enabled')}
        description={t('This watch does not use the Restock & Price processor.')}
      />
    )
  }

  if (query.isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    )
  }

  if (query.isError) {
    return (
      <EmptyState
        icon={LineChart}
        title={t('No price history available')}
        description={t('This watch does not provide price or stock data.')}
      />
    )
  }

  const data = query.data!
  const priced = data.series.filter((point) => point.price !== null)
  if (!priced.length) {
    return (
      <EmptyState
        icon={LineChart}
        title={t('No prices detected yet')}
        description={t('The Restock & Price processor has not found a price in the snapshots.')}
      />
    )
  }

  const summary = data.summary
  const prices = priced.map((point) => point.price as number)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const spread = max - min || 1
  const width = 800
  const height = 240
  const padX = 36
  const padY = 24
  const xFor = (index: number) => padX + (index / Math.max(1, priced.length - 1)) * (width - padX * 2)
  const yFor = (price: number) => padY + (1 - (price - min) / spread) * (height - padY * 2)
  const points = priced.map((point, index) => `${xFor(index)},${yFor(point.price as number)}`).join(' ')
  const area = `${padX},${height - padY} ${points} ${width - padX},${height - padY}`

  return (
    <div className="space-y-4 p-3 md:p-4">
      {summary ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label={t('Current')} value={formatPrice(summary.current, data.currency, locale)} tone={summary.status} />
          <Metric label={t('Lowest')} value={formatPrice(summary.min, data.currency, locale)} />
          <Metric label={t('Highest')} value={formatPrice(summary.max, data.currency, locale)} />
          <Metric label={t('Average')} value={formatPrice(summary.avg, data.currency, locale)} />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-card border border-border bg-surface p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={t('Price history chart')}
          className="h-auto w-full"
        >
          <defs>
            <linearGradient id="price-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--primary))" stopOpacity="0.25" />
              <stop offset="100%" stopColor="rgb(var(--primary))" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const y = padY + fraction * (height - padY * 2)
            return (
              <line
                key={fraction}
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="rgb(var(--border))"
                strokeWidth="1"
              />
            )
          })}
          <polygon points={area} fill="url(#price-fill)" />
          <polyline
            points={points}
            fill="none"
            stroke="rgb(var(--primary))"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {priced.map((point, index) => (
            <circle
              key={point.timestamp}
              cx={xFor(index)}
              cy={yFor(point.price as number)}
              r={index === priced.length - 1 ? 4.5 : 2.5}
              fill={index === priced.length - 1 ? 'rgb(var(--primary))' : 'rgb(var(--surface))'}
              stroke="rgb(var(--primary))"
              strokeWidth="1.5"
            >
              <title>
                {formatDateTime(point.timestamp, locale)} · {formatPrice(point.price, data.currency, locale)}
              </title>
            </circle>
          ))}
          <text x={padX} y={padY - 6} className="fill-[rgb(var(--text-muted))] text-[11px]">
            {formatPrice(max, data.currency, locale)}
          </text>
          <text x={padX} y={height - 4} className="fill-[rgb(var(--text-muted))] text-[11px]">
            {formatDateTime(priced[0].timestamp, locale)}
          </text>
          <text x={width - padX} y={height - 4} textAnchor="end" className="fill-[rgb(var(--text-muted))] text-[11px]">
            {formatDateTime(priced[priced.length - 1].timestamp, locale)}
          </text>
        </svg>
      </div>

      <div className="overflow-hidden rounded-card border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-2 text-muted">
            <tr>
              <th className="px-3 py-2">{t('When')}</th>
              <th className="px-3 py-2">{t('Price')}</th>
              <th className="px-3 py-2">{t('Stock')}</th>
            </tr>
          </thead>
          <tbody>
            {[...data.series].reverse().slice(0, 25).map((point) => (
              <tr key={point.timestamp} className="border-t border-border">
                <td className="px-3 py-2 text-muted">{formatDateTime(point.timestamp, locale)}</td>
                <td className="px-3 py-2 font-medium">
                  {formatPrice(point.price, data.currency, locale)}
                </td>
                <td className="px-3 py-2">
                  {point.in_stock === null ? (
                    '—'
                  ) : point.in_stock ? (
                    <Badge tone="success">{t('In stock')}</Badge>
                  ) : (
                    <Badge tone="danger">{t('Out of stock')}</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'low' | 'high' | 'typical'
}) {
  return (
    <div className="rounded-card border border-border bg-surface px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 flex items-center gap-1 text-sm font-semibold">
        {value}
        {tone === 'low' ? <ArrowDownRight className="h-3.5 w-3.5 text-success" /> : null}
        {tone === 'high' ? <ArrowUpRight className="h-3.5 w-3.5 text-danger" /> : null}
      </p>
    </div>
  )
}
