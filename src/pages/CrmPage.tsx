import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LayoutGrid, List, Star } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { KanbanBoard } from '../components/kanban/KanbanBoard'
import { LeadModal } from '../components/kanban/LeadModal'
import { performanceApi, leadsApi } from '../lib/api'

export function CrmPage() {
  const [view, setView] = useState<'kanban' | 'list'>('kanban')

  const { data: slaAlerts = [] } = useQuery({
    queryKey: ['sla-alerts'],
    queryFn: performanceApi.slaAlerts,
    refetchInterval: 60_000,
  })

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Leads</h1>
          {slaAlerts.length > 0 && (
            <p className="text-sm text-red-500 mt-0.5">
              {slaAlerts.length} lead(s) com SLA estourado
            </p>
          )}
        </div>

        <div className="flex border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setView('kanban')}
            className={`px-3 py-2 transition-colors ${view === 'kanban' ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-2 transition-colors ${view === 'list' ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {view === 'kanban' ? <KanbanBoard /> : <LeadListView />}
      </div>
    </div>
  )
}

function LeadListView() {
  const { data: leads = [] } = useQuery({ queryKey: ['leads'], queryFn: () => leadsApi.list() })
  const [selected, setSelected] = useState<any>(null)

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Cliente', 'Status', 'Produto', 'Valor', 'Prob.', 'Próxima ação', 'Data'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map((lead: any) => (
                <tr
                  key={lead.id}
                  onClick={() => setSelected(lead)}
                  className={`hover:bg-gray-50 cursor-pointer transition-colors ${lead.slaBreached ? 'bg-red-50/40' : ''}`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{lead.nomeCliente}</td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                      style={{ backgroundColor: (lead.status?.color || '#888') + '20', color: lead.status?.color || '#888' }}
                    >
                      {lead.status?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{lead.produtoInteresse || '—'}</td>
                  <td className="px-4 py-3 text-green-600 whitespace-nowrap">
                    {lead.valorNegociacao
                      ? `R$ ${Number(lead.valorNegociacao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} size={11}
                          className={i <= (lead.probabilidadeEstrelas || 0)
                            ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{lead.proximaAcao || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {lead.createdAt && format(new Date(lead.createdAt), 'dd/MM/yy', { locale: ptBR })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length === 0 && (
            <p className="text-center text-gray-400 py-12 text-sm">Nenhum lead encontrado.</p>
          )}
        </div>
      </div>
      {selected && <LeadModal lead={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
