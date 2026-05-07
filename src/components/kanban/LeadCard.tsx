import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Star, Clock, Phone, MessageCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { LeadModal } from './LeadModal'

interface Props { lead: any }

export function LeadCard({ lead }: Props) {
  const [open, setOpen] = useState(false)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined

  const isSlaWarning = lead.slaDeadline && !lead.slaBreached &&
    new Date(lead.slaDeadline) < new Date(Date.now() + 5 * 60_000)

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onClick={e => { e.stopPropagation(); setOpen(true) }}
        className={`bg-white rounded-xl border p-3 cursor-pointer select-none transition-shadow
          ${isDragging ? 'shadow-xl opacity-80 rotate-1 scale-105' : 'shadow-sm hover:shadow-md'}
          ${lead.slaBreached ? 'border-red-300 bg-red-50/30' : isSlaWarning ? 'border-amber-300' : 'border-gray-200'}
        `}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="font-medium text-sm text-gray-900 leading-tight">{lead.nomeCliente}</p>
          {lead.slaBreached && (
            <span className="flex-shrink-0 flex items-center gap-1 text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
              <Clock size={10} />
              SLA
            </span>
          )}
        </div>

        {lead.probabilidadeEstrelas > 0 && (
          <div className="flex gap-0.5 mb-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Star
                key={i}
                size={12}
                className={i <= lead.probabilidadeEstrelas
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-gray-200 fill-gray-200'}
              />
            ))}
          </div>
        )}

        <div className="space-y-0.5">
          {lead.produtoInteresse && (
            <p className="text-xs text-gray-500 truncate">{lead.produtoInteresse}</p>
          )}
          {lead.valorNegociacao && (
            <p className="text-xs font-medium text-green-600">
              R$ {Number(lead.valorNegociacao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            {lead.canal === 'ligacao'
              ? <Phone size={10} />
              : <MessageCircle size={10} />}
            <span className="capitalize">{lead.canal || 'manual'}</span>
          </div>
          <span className="text-xs text-gray-400">
            {lead.createdAt
              ? formatDistanceToNow(new Date(lead.createdAt), { locale: ptBR, addSuffix: true })
              : ''}
          </span>
        </div>

        {lead.proximaAcao && (
          <p className="mt-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg px-2 py-1 truncate">
            → {lead.proximaAcao}
          </p>
        )}
      </div>

      {open && <LeadModal lead={lead} onClose={() => setOpen(false)} />}
    </>
  )
}
