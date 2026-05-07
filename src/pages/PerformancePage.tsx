import { useQuery } from '@tanstack/react-query'
import { performanceApi } from '../lib/api'

type Snapshot = {
  id: string
  user?: { id: string; name: string }
  refDate: string
  leadsReceived: number
  leadsConverted: number
  leadsLost: number
  conversionRate: number | string
  avgFirstResponseMin: number
  slaBreaches: number
  totalValueConverted: number | string
}

const brl = (v: number | string) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const pct = (v: number | string) => {
  const n = Number(v)
  return `${(n <= 1 ? n * 100 : n).toFixed(1)}%`
}

export function PerformancePage() {
  const { data, isLoading, error } = useQuery<Snapshot[]>({
    queryKey: ['performance-snapshots', 30],
    queryFn: () => performanceApi.snapshots({ days: 30 }),
  })

  if (isLoading) {
    return <div className="p-6 text-gray-500">Carregando...</div>
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        Erro ao carregar performance: {(error as Error).message}
      </div>
    )
  }

  const snapshots = data ?? []

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Performance</h1>

      {snapshots.length === 0 ? (
        <p className="text-gray-500">
          Nenhum snapshot disponível ainda. Os dados são gerados diariamente às 23h55.
        </p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Vendedora</th>
                <th className="px-4 py-3 text-right">Recebidos</th>
                <th className="px-4 py-3 text-right">Convertidos</th>
                <th className="px-4 py-3 text-right">Perdidos</th>
                <th className="px-4 py-3 text-right">Conversão</th>
                <th className="px-4 py-3 text-right">SLA estourados</th>
                <th className="px-4 py-3 text-right">Valor convertido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {snapshots.map(s => (
                <tr key={s.id}>
                  <td className="px-4 py-3">{s.refDate}</td>
                  <td className="px-4 py-3">{s.user?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-right">{s.leadsReceived}</td>
                  <td className="px-4 py-3 text-right">{s.leadsConverted}</td>
                  <td className="px-4 py-3 text-right">{s.leadsLost}</td>
                  <td className="px-4 py-3 text-right">{pct(s.conversionRate)}</td>
                  <td className="px-4 py-3 text-right">{s.slaBreaches}</td>
                  <td className="px-4 py-3 text-right">{brl(s.totalValueConverted)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
