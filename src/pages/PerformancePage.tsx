import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from 'recharts'
import { eachDayOfInterval, format, isSameDay, parseISO, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  TrendingUp, Inbox, CheckCircle2, XCircle, Wallet, Receipt, AlertCircle, ChevronRight,
} from 'lucide-react'
import {
  FilterBar, EMPTY_FILTERS, filtersToApiParams, type FilterState,
} from '../components/kanban/FilterBar'
import { leadsApi, statusesApi, usersApi } from '../lib/api'
import { useAuthStore } from '../lib/store'

const formatBrl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })

const formatBrlShort = (n: number) => {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `R$ ${(n / 1_000).toFixed(1)}k`
  return formatBrl(n)
}

const CANAL_COLORS: Record<string, string> = {
  whatsapp:  '#10b981',
  ligacao:   '#3b82f6',
  chat_site: '#06b6d4',
  monday:    '#a855f7',
  manual:    '#9ca3af',
}

const CANAL_LABELS: Record<string, string> = {
  whatsapp:  'WhatsApp',
  ligacao:   'Ligação',
  chat_site: 'Chat site',
  monday:    'Monday',
  manual:    'Manual',
}

const MOTIVO_PALETTE = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899']

// ───────────────────────────────────────────────────────────────────────────
export function PerformancePage() {
  const currentUser = useAuthStore(s => s.user)
  const isAdmin = currentUser?.role === 'admin'
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const apiParams = filtersToApiParams(filters)

  const { data: leads = [] } = useQuery({
    queryKey: ['perf-leads', apiParams],
    queryFn: () => leadsApi.list(apiParams),
  })
  const { data: statuses = [] } = useQuery({ queryKey: ['statuses'], queryFn: statusesApi.list })
  const { data: vendedoras = [] } = useQuery({ queryKey: ['vendedoras'], queryFn: usersApi.vendedoras })

  const kpis = useMemo(() => computeKpis(leads), [leads])

  const selectVendedora = (id: string | undefined) => {
    setFilters(f => ({ ...f, userId: id ?? '' }))
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto pb-8">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          Performance
        </h1>
        <p className="text-sm text-gray-500 mt-1">Métricas, funil de vendas e ranking de vendedoras.</p>
      </header>

      <FilterBar filters={filters} onChange={setFilters} />

      <KpiRow kpis={kpis} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <ChartCard title="Funil de vendas" subtitle="Pipeline por estágio · contagem e valor" className="xl:col-span-1">
          <FunnelStages statuses={statuses} leads={leads} />
        </ChartCard>
        <ChartCard title="Leads por dia" subtitle="Recebidos × convertidos" className="xl:col-span-2">
          <TimelineChart leads={leads} filters={filters} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Origem do lead" subtitle="Por canal de entrada">
          <CanalDonut leads={leads} />
        </ChartCard>
        <ChartCard title="Motivos de não venda" subtitle="Por que perdemos">
          <MotivoDonut leads={leads} />
        </ChartCard>
      </div>

      <ChartCard
        title="Performance por vendedora"
        subtitle={isAdmin ? "Clique numa vendedora pra filtrar tudo nela" : "Suas métricas no período"}
      >
        <VendedoraSection
          leads={leads}
          vendedoras={vendedoras}
          isAdmin={isAdmin}
          selectedUserId={filters.userId}
          onSelect={selectVendedora}
        />
      </ChartCard>
    </div>
  )
}

// ─── KPI Row ───────────────────────────────────────────────────────────────
function KpiRow({ kpis }: { kpis: ReturnType<typeof computeKpis> }) {
  const items = [
    { label: 'Leads recebidos',   value: kpis.total,             icon: Inbox,        color: 'blue',    accent: false },
    { label: 'Convertidos',       value: kpis.won,               icon: CheckCircle2, color: 'emerald', accent: false },
    { label: 'Perdidos',          value: kpis.lost,              icon: XCircle,      color: 'red',     accent: false },
    { label: 'Taxa de conversão', value: `${kpis.conversionRate.toFixed(1)}%`, icon: TrendingUp, color: 'violet', accent: false },
    { label: 'Valor convertido',  value: formatBrlShort(kpis.totalValue), icon: Wallet, color: 'emerald', accent: true },
    { label: 'Ticket médio',      value: formatBrlShort(kpis.avgTicket),  icon: Receipt, color: 'amber', accent: false },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
      {items.map(it => <KpiCard key={it.label} {...it} />)}
      {kpis.slaBreaches > 0 && (
        <div className="col-span-2 sm:col-span-3 xl:col-span-6 bg-gradient-to-r from-red-50 to-amber-50 border border-red-100 rounded-xl px-4 py-2 flex items-center gap-2">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            <span className="font-semibold">{kpis.slaBreaches}</span> lead(s) com SLA estourado no período
          </p>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, icon: Icon, color, accent }: any) {
  const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
    blue:    { bg: 'bg-white',        text: 'text-blue-600',    iconBg: 'bg-blue-50' },
    emerald: { bg: 'bg-white',        text: 'text-emerald-600', iconBg: 'bg-emerald-50' },
    red:     { bg: 'bg-white',        text: 'text-red-600',     iconBg: 'bg-red-50' },
    violet:  { bg: 'bg-white',        text: 'text-violet-600',  iconBg: 'bg-violet-50' },
    amber:   { bg: 'bg-white',        text: 'text-amber-600',   iconBg: 'bg-amber-50' },
  }
  const c = colorMap[color]
  return (
    <div className={`${c.bg} rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow ${
      accent ? 'ring-1 ring-emerald-100 bg-gradient-to-br from-white to-emerald-50/40' : ''
    }`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 mb-1 truncate">{label}</p>
          <p className={`text-2xl font-bold tracking-tight ${c.text}`}>{value}</p>
        </div>
        <div className={`${c.iconBg} w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon size={16} className={c.text} />
        </div>
      </div>
    </div>
  )
}

// ─── Funnel Stages ─────────────────────────────────────────────────────────
function FunnelStages({ statuses, leads }: { statuses: any[]; leads: any[] }) {
  const stages = useMemo(() => {
    return statuses
      .filter((s: any) => !s.isFinal || s.label?.toLowerCase() === 'fechado')
      .sort((a: any, b: any) => a.position - b.position)
      .map((s: any) => {
        const stageLeads = leads.filter((l: any) => l.status?.id === s.id)
        return {
          ...s,
          count: stageLeads.length,
          value: stageLeads.reduce((sum: number, l: any) => sum + Number(l.valorNegociacao || 0), 0),
        }
      })
  }, [statuses, leads])

  const max = Math.max(...stages.map(s => s.count), 1)

  if (stages.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">Sem status configurados.</p>
  }

  return (
    <div className="space-y-3">
      {stages.map((s, i) => {
        const widthPct = Math.max((s.count / max) * 100, 18)
        const conversion = i > 0 && stages[i - 1].count > 0
          ? (s.count / stages[i - 1].count) * 100
          : null
        return (
          <div key={s.id}>
            <div className="flex items-center gap-3">
              <div
                className="h-11 rounded-xl flex items-center px-3.5 shadow-sm transition-all duration-300"
                style={{
                  width: `${widthPct}%`,
                  background: `linear-gradient(135deg, ${s.color}ee, ${s.color})`,
                }}
              >
                <span className="text-white font-medium text-xs flex-1 truncate drop-shadow-sm">{s.label}</span>
                <span className="text-white font-bold text-sm drop-shadow-sm">{s.count}</span>
              </div>
              {conversion !== null && (
                <span className="text-[11px] text-gray-400 whitespace-nowrap flex items-center gap-0.5">
                  <ChevronRight size={10} /> {conversion.toFixed(0)}%
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1 ml-1">{formatBrl(s.value)}</p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Timeline Chart ────────────────────────────────────────────────────────
function TimelineChart({ leads, filters }: { leads: any[]; filters: FilterState }) {
  const data = useMemo(() => {
    const today = new Date()
    let from: Date
    let to: Date = today

    if (filters.dateFrom && filters.dateTo) {
      from = parseISO(filters.dateFrom)
      to = parseISO(filters.dateTo)
    } else {
      from = subDays(today, 29)
    }

    const days = eachDayOfInterval({ start: from, end: to })
    return days.map(day => {
      const recebidos = leads.filter(l => l.createdAt && isSameDay(parseISO(l.createdAt), day)).length
      const convertidos = leads.filter(l =>
        l.status?.label?.toLowerCase() === 'fechado'
        && l.updatedAt && isSameDay(parseISO(l.updatedAt), day)
      ).length
      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        recebidos,
        convertidos,
      }
    })
  }, [leads, filters.dateFrom, filters.dateTo])

  if (data.every(d => d.recebidos === 0 && d.convertidos === 0)) {
    return <p className="text-sm text-gray-400 text-center py-8">Sem dados no período.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} stroke="#e5e7eb" />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} stroke="#e5e7eb" />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 12 }}
          labelStyle={{ color: '#374151', fontWeight: 600 }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Line type="monotone" dataKey="recebidos"   name="Recebidos"   stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="convertidos" name="Convertidos" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── Donuts ────────────────────────────────────────────────────────────────
function CanalDonut({ leads }: { leads: any[] }) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {}
    leads.forEach(l => {
      const canal = l.canal || 'manual'
      counts[canal] = (counts[canal] || 0) + 1
    })
    return Object.entries(counts).map(([key, value]) => ({
      key,
      name: CANAL_LABELS[key] || key,
      value,
      fill: CANAL_COLORS[key] || '#9ca3af',
    }))
  }, [leads])

  return <CategoryDonut data={data} />
}

function MotivoDonut({ leads }: { leads: any[] }) {
  const data = useMemo(() => {
    const lost = leads.filter(l =>
      l.status?.isFinal && l.status?.label?.toLowerCase() !== 'fechado'
    )
    const counts: Record<string, number> = {}
    lost.forEach(l => {
      const m = (l.motivoNaoVenda && l.motivoNaoVenda.trim()) || 'Sem motivo informado'
      counts[m] = (counts[m] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({
        name,
        value,
        fill: MOTIVO_PALETTE[i % MOTIVO_PALETTE.length],
      }))
  }, [leads])

  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-12">Nenhum lead perdido no período.</p>
  }

  return <CategoryDonut data={data} />
}

function CategoryDonut({ data }: { data: { name: string; value: number; fill: string }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-12">Sem dados.</p>
  }
  const total = data.reduce((sum, d) => sum + d.value, 0)
  return (
    <div className="flex flex-col md:flex-row items-center gap-4">
      <div className="w-full md:w-1/2" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
              {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 12 }}
              formatter={(v: any, _n: any, p: any) => [`${v} (${((v / total) * 100).toFixed(0)}%)`, p.payload.name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-full md:w-1/2 space-y-1.5">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.fill }} />
            <span className="text-gray-700 truncate flex-1">{d.name}</span>
            <span className="text-gray-500 font-medium">{d.value}</span>
            <span className="text-gray-400 text-[11px] w-9 text-right">{((d.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Vendedora Section ─────────────────────────────────────────────────────
function VendedoraSection({
  leads, vendedoras, isAdmin, selectedUserId, onSelect,
}: {
  leads: any[]; vendedoras: any[]; isAdmin: boolean
  selectedUserId: string; onSelect: (id: string | undefined) => void
}) {
  const rows = useMemo(() => {
    const map: Record<string, { user: any; total: number; won: number; lost: number; value: number }> = {}
    leads.forEach((l: any) => {
      if (!l.user) return
      if (!map[l.user.id]) {
        const v = vendedoras.find((x: any) => x.id === l.user.id)
        map[l.user.id] = {
          user: { id: l.user.id, name: l.user.name, photoUrl: v?.photoUrl ?? null },
          total: 0, won: 0, lost: 0, value: 0,
        }
      }
      const row = map[l.user.id]
      row.total++
      if (l.status?.label?.toLowerCase() === 'fechado') {
        row.won++
        row.value += Number(l.valorNegociacao || 0)
      } else if (l.status?.isFinal) {
        row.lost++
      }
    })
    return Object.values(map).sort((a, b) => b.value - a.value)
  }, [leads, vendedoras])

  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">Nenhum lead atribuído a vendedora no período.</p>
  }

  const chartData = rows.map(r => ({
    name: r.user.name,
    valor: r.value,
    convertidos: r.won,
    userId: r.user.id,
  }))

  return (
    <div className="space-y-4">
      <div style={{ width: '100%', height: Math.max(rows.length * 40 + 40, 180) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} stroke="#e5e7eb" tickFormatter={(v) => formatBrlShort(v)} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#374151' }} stroke="#e5e7eb" width={140} />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 12 }}
              formatter={(v: any) => formatBrl(Number(v))}
            />
            <defs>
              <linearGradient id="vendedoraGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <Bar
              dataKey="valor"
              name="Valor convertido"
              fill="url(#vendedoraGradient)"
              radius={[0, 8, 8, 0]}
              onClick={(d: any) => isAdmin && onSelect(d.userId === selectedUserId ? undefined : d.userId)}
              style={{ cursor: isAdmin ? 'pointer' : 'default' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Vendedora', 'Recebidos', 'Convertidos', 'Perdidos', 'Taxa', 'Valor'].map(h => (
                <th key={h} className="text-left px-2 py-2 text-[11px] font-medium text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(r => {
              const rate = r.total > 0 ? (r.won / r.total) * 100 : 0
              const selected = r.user.id === selectedUserId
              return (
                <tr
                  key={r.user.id}
                  onClick={() => isAdmin && onSelect(selected ? undefined : r.user.id)}
                  className={`transition-colors ${
                    isAdmin ? 'cursor-pointer hover:bg-blue-50/40' : ''
                  } ${selected ? 'bg-blue-50/60' : ''}`}
                >
                  <td className="px-2 py-2 flex items-center gap-2 min-w-0">
                    {r.user.photoUrl ? (
                      <img src={r.user.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-gray-100 flex-shrink-0" onError={e => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-[10px] font-semibold text-gray-600 flex-shrink-0">
                        {r.user.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <span className="font-medium text-gray-800 truncate">{r.user.name}</span>
                  </td>
                  <td className="px-2 py-2 text-gray-600">{r.total}</td>
                  <td className="px-2 py-2 text-emerald-600 font-medium">{r.won}</td>
                  <td className="px-2 py-2 text-red-500">{r.lost}</td>
                  <td className="px-2 py-2">
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                      rate >= 50 ? 'bg-emerald-50 text-emerald-700' :
                      rate >= 20 ? 'bg-amber-50 text-amber-700' :
                                   'bg-gray-100 text-gray-500'
                    }`}>
                      {rate.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-2 py-2 text-emerald-600 font-semibold whitespace-nowrap">{formatBrl(r.value)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Card wrapper ──────────────────────────────────────────────────────────
function ChartCard({
  title, subtitle, children, className = '',
}: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${className}`}>
      <header className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function computeKpis(leads: any[]) {
  const total = leads.length
  const won = leads.filter((l: any) => l.status?.label?.toLowerCase() === 'fechado').length
  const lost = leads.filter((l: any) => l.status?.isFinal && l.status?.label?.toLowerCase() !== 'fechado').length
  const totalValue = leads
    .filter((l: any) => l.status?.label?.toLowerCase() === 'fechado')
    .reduce((sum: number, l: any) => sum + Number(l.valorNegociacao || 0), 0)
  const avgTicket = won > 0 ? totalValue / won : 0
  const conversionRate = total > 0 ? (won / total) * 100 : 0
  const slaBreaches = leads.filter((l: any) => l.slaBreached).length
  return { total, won, lost, totalValue, avgTicket, conversionRate, slaBreaches }
}
