import { useDroppable } from '@dnd-kit/core'
import { LeadCard } from './LeadCard'

interface Props {
  status: { id: string; label: string; color: string }
  leads: any[]
}

export function KanbanColumn({ status, leads }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id })

  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: status.color }}
        />
        <h3 className="font-medium text-sm text-gray-700 flex-1">{status.label}</h3>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
          {leads.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`space-y-2 min-h-24 rounded-xl p-2 transition-colors ${
          isOver ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50 border-2 border-transparent'
        }`}
      >
        {leads.map(lead => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  )
}
