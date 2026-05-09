import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { LeadCard } from './LeadCard'

interface Props {
  status: { id: string; label: string; color: string }
  leads: any[]
}

function formatTotal(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function KanbanColumn({ status, leads }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id })

  const total = leads.reduce((acc, l) => acc + (Number(l.valorNegociacao) || 0), 0)

  return (
    <div className="flex-shrink-0 w-72 flex flex-col h-full min-h-0">
      {/* Header da coluna */}
      <div
        className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 mb-3"
        style={{ borderTop: `3px solid ${status.color}` }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-900 truncate">{status.label}</h3>
          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
            {leads.length}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Total: <span className="font-medium text-gray-700">{formatTotal(total)}</span>
        </p>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`space-y-2 min-h-32 rounded-xl p-2 transition-colors flex-1 min-h-0 overflow-y-auto ${
          isOver ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-gray-50/50'
        }`}
      >
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <p className="text-center text-xs text-gray-300 py-6">Nenhum lead</p>
        )}
      </div>
    </div>
  )
}
