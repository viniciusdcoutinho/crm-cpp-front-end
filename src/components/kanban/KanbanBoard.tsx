import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  closestCorners, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { leadsApi, statusesApi, type LeadFilters } from '../../lib/api'
import { KanbanColumn } from './KanbanColumn'
import { LeadCardOverlay } from './LeadCard'

interface Props { filters?: LeadFilters }

export function KanbanBoard({ filters }: Props) {
  const qc = useQueryClient()
  const pipelineId = filters?.pipelineId
  const { data: leads = [] }    = useQuery({
    queryKey: ['leads', filters],
    queryFn: () => leadsApi.list(filters),
  })
  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses', pipelineId],
    queryFn: () => statusesApi.list(pipelineId),
    enabled: !!pipelineId,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const [activeId, setActiveId] = useState<string | null>(null)
  const activeLead = activeId ? leads.find((l: any) => l.id === activeId) : null

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }
  const handleDragCancel = () => setActiveId(null)

  const moveLead = useMutation({
    mutationFn: ({ id, statusId, position }: { id: string; statusId: string; position: number }) =>
      leadsApi.update(id, { statusId, position }),
    onMutate: async ({ id, statusId, position }) => {
      await qc.cancelQueries({ queryKey: ['leads'] })
      const newStatus = statuses.find((s: any) => s.id === statusId)
      const previous = qc.getQueriesData<any[]>({ queryKey: ['leads'] })
      qc.setQueriesData<any[]>({ queryKey: ['leads'] }, (old) => {
        if (!old) return old
        return old.map(l => l.id === id ? { ...l, status: newStatus, position } : l)
      })
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) ctx.previous.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const leadId = String(active.id)
    const overId = String(over.id)
    if (leadId === overId) return

    const dragged = leads.find((l: any) => l.id === leadId)
    if (!dragged) return

    // over.id pode ser ID de status (coluna) OU de lead (card alvo)
    const isColumn = statuses.some((s: any) => s.id === overId)
    let targetStatusId: string
    let beforeLead: any | null = null  // card acima (maior position) na ordenacao DESC
    let afterLead:  any | null = null  // card abaixo (menor position)

    if (isColumn) {
      // drop na area da coluna -> vai pro fim (abaixo do ultimo card visualmente)
      targetStatusId = overId
      const colLeads = leads
        .filter((l: any) => l.status?.id === targetStatusId && l.id !== leadId)
        .sort((a: any, b: any) => (b.position ?? 0) - (a.position ?? 0))
      beforeLead = colLeads[colLeads.length - 1] ?? null
      afterLead  = null
    } else {
      // drop em cima de um card especifico -> vai imediatamente acima dele
      const target = leads.find((l: any) => l.id === overId)
      if (!target) return
      targetStatusId = target.status?.id
      const colLeads = leads
        .filter((l: any) => l.status?.id === targetStatusId && l.id !== leadId)
        .sort((a: any, b: any) => (b.position ?? 0) - (a.position ?? 0))
      const idx = colLeads.findIndex((l: any) => l.id === target.id)
      beforeLead = idx > 0 ? colLeads[idx - 1] : null
      afterLead  = target
    }

    // Calcula nova position. Quanto MAIOR o numero, mais acima na coluna.
    let newPosition: number
    if (beforeLead && afterLead) {
      newPosition = ((beforeLead.position ?? 0) + (afterLead.position ?? 0)) / 2
    } else if (beforeLead) {
      newPosition = (beforeLead.position ?? 0) - 1000
    } else if (afterLead) {
      newPosition = (afterLead.position ?? 0) + 1000
    } else {
      newPosition = Date.now()
    }

    if (dragged.status?.id === targetStatusId && dragged.position === newPosition) return

    moveLead.mutate({ id: leadId, statusId: targetStatusId, position: newPosition })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-4 h-full items-stretch">
        {statuses.map((status: any) => {
          const colLeads = leads
            .filter((l: any) => l.status?.id === status.id)
            .sort((a: any, b: any) => (b.position ?? 0) - (a.position ?? 0))
          return (
            <KanbanColumn key={status.id} status={status} leads={colLeads} />
          )
        })}
      </div>
      <DragOverlay dropAnimation={{ duration: 200 }}>
        {activeLead ? <LeadCardOverlay lead={activeLead} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
