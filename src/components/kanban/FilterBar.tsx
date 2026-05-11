import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { lossReasonsApi, adminApi, type LeadFilters } from '../../lib/api'
import { useAuthStore } from '../../lib/store'

export type FilterPreset = 'all' | 'today' | 'yesterday' | 'current_month' | 'last_month' | 'custom'

export type FilterState = {
  preset: FilterPreset
  dateFrom: string
  dateTo: string
  motivoNaoVenda: string
  search: string
  userId: string
  canal: string
}

export const EMPTY_FILTERS: FilterState = {
  preset: 'all',
  dateFrom: '',
  dateTo: '',
  motivoNaoVenda: '',
  search: '',
  userId: '',
  canal: '',
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function presetToRange(preset: FilterPreset): { dateFrom: string; dateTo: string } {
  const today = new Date()
  if (preset === 'today') {
    const t = ymd(today)
    return { dateFrom: t, dateTo: t }
  }
  if (preset === 'yesterday') {
    const y = new Date(today); y.setDate(today.getDate() - 1)
    const ys = ymd(y)
    return { dateFrom: ys, dateTo: ys }
  }
  if (preset === 'current_month') {
    return {
      dateFrom: ymd(new Date(today.getFullYear(), today.getMonth(), 1)),
      dateTo:   ymd(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    }
  }
  if (preset === 'last_month') {
    return {
      dateFrom: ymd(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      dateTo:   ymd(new Date(today.getFullYear(), today.getMonth(), 0)),
    }
  }
  return { dateFrom: '', dateTo: '' }
}

export function filtersToApiParams(f: FilterState): LeadFilters {
  return {
    userId:         f.userId || undefined,
    dateFrom:       f.dateFrom || undefined,
    dateTo:         f.dateTo   || undefined,
    motivoNaoVenda: f.motivoNaoVenda || undefined,
    search:         f.search.trim() || undefined,
    canal:          f.canal || undefined,
  }
}

export function hasActiveFilters(f: FilterState): boolean {
  return f.preset !== 'all' || !!f.search.trim() || !!f.motivoNaoVenda || !!f.userId || !!f.canal
}

const CANAL_OPTIONS: { value: string; label: string }[] = [
  { value: 'whatsapp',   label: 'WhatsApp' },
  { value: 'ligacao',    label: 'Ligação' },
  { value: 'rd_station', label: 'RD Station' },
]

interface Props {
  filters: FilterState
  onChange: (f: FilterState) => void
}

export function FilterBar({ filters, onChange }: Props) {
  const currentUser = useAuthStore(s => s.user)
  const isAdmin = currentUser?.role === 'admin'

  const { data: reasons = [] } = useQuery({ queryKey: ['loss-reasons-public'], queryFn: lossReasonsApi.list })
  const { data: allUsers = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminApi.listUsers,
    enabled: isAdmin,
  })
  const vendedoras = allUsers.filter((u: any) => u.role === 'vendedora' && u.active)

  const presets: { id: FilterPreset; label: string }[] = [
    { id: 'all',           label: 'Tudo'         },
    { id: 'today',         label: 'Hoje'         },
    { id: 'yesterday',     label: 'Ontem'        },
    { id: 'current_month', label: 'Este mês'     },
    { id: 'last_month',    label: 'Mês passado'  },
    { id: 'custom',        label: 'Personalizado'},
  ]

  const setPreset = (preset: FilterPreset) => {
    if (preset === 'custom') {
      onChange({ ...filters, preset, dateFrom: filters.dateFrom, dateTo: filters.dateTo })
    } else {
      const range = presetToRange(preset)
      onChange({ ...filters, preset, ...range })
    }
  }

  const clear = () => onChange(EMPTY_FILTERS)
  const inputCls = 'text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100'

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-white rounded-xl border border-gray-100">
      {/* Presets */}
      <div className="flex flex-wrap gap-1">
        {presets.map(p => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filters.preset === p.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {filters.preset === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => onChange({ ...filters, dateFrom: e.target.value })}
            className={inputCls}
          />
          <span className="text-xs text-gray-400">até</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => onChange({ ...filters, dateTo: e.target.value })}
            className={inputCls}
          />
        </div>
      )}

      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder="Nome ou telefone"
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          className={`${inputCls} pl-8 w-full`}
        />
      </div>

      {/* Vendedora — só admin */}
      {isAdmin && (
        <select
          value={filters.userId}
          onChange={e => onChange({ ...filters, userId: e.target.value })}
          className={inputCls}
        >
          <option value="">Todas vendedoras</option>
          {vendedoras.map((u: any) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      )}

      {/* Origem (canal) */}
      <select
        value={filters.canal}
        onChange={e => onChange({ ...filters, canal: e.target.value })}
        className={inputCls}
      >
        <option value="">Todas origens</option>
        {CANAL_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Loss reason */}
      <select
        value={filters.motivoNaoVenda}
        onChange={e => onChange({ ...filters, motivoNaoVenda: e.target.value })}
        className={inputCls}
      >
        <option value="">Todos os motivos</option>
        {reasons.map((r: any) => (
          <option key={r.id} value={r.label}>{r.label}</option>
        ))}
      </select>

      {/* Clear */}
      {hasActiveFilters(filters) && (
        <button
          onClick={clear}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
        >
          <X size={12} />
          Limpar
        </button>
      )}
    </div>
  )
}
