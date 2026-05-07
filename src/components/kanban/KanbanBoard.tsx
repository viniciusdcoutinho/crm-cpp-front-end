import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { leadsApi, statusesApi } from '../../lib/api'
import { KanbanColumn } from './KanbanColumn'

export function KanbanBoard() {
  const qc = useQueryClient()
  const { data: leads = [] }    = useQuery({ queryKey: ['leads'],    queryFn: () => leadsApi.list() })
  const { data: statuses = [] } = useQuery({ queryKey: ['statuses'], queryFn: statusesApi.list })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const moveLead = useMutation({
    mutationFn: ({ id, statusId }: { id: string; statusId: string }) =>
      leadsApi.update(id, { statusId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const leadId   = String(active.id)
    const statusId = String(over.id)
    const lead = leads.find((l: any) => l.id === leadId)
    if (!lead || lead.status?.id === statusId) return
    moveLead.mutate({ id: leadId, statusId })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-full items-start">
        {statuses.map((status: any) => (
          <KanbanColumn
            key={status.id}
            status={status}
            leads={leads.filter((l: any) => l.status?.id === status.id)}
          />
        ))}
      </div>
    </DndContext>
  )
}
