import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Star, AlertCircle, Phone, MessageCircle, MessageSquare, Calendar, User, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { LeadModal } from './LeadModal'

interface Props { lead: any }

const CHANNEL_META: Record<string, { Icon: any; color: string; bg: string; label: string }> = {
  whatsapp:  { Icon: MessageCircle, color: 'text-green-600',  bg: 'bg-green-50',  label: 'WhatsApp'  },
  ligacao:   { Icon: Phone,         color: 'text-blue-600',   bg: 'bg-blue-50',   label: 'Ligação'   },
  chat_site: { Icon: MessageSquare, color: 'text-sky-600',    bg: 'bg-sky-50',    label: 'Chat site' },
  monday:    { Icon: Calendar,      color: 'text-purple-600', bg: 'bg-purple-50', label: 'Monday'    },
  manual:    { Icon: User,          color: 'text-gray-500',   bg: 'bg-gray-100',  label: 'Manual'    },
}

function getInitials(name?: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?'
  return ((parts[0][0] || '') + (parts[parts.length - 1][0] || '')).toUpperCase()
}

function formatCurrency(v: any): string {
  const n = Number(v)
  if (!n || isNaN(n)) return ''
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function LeadCard({ lead }: Props) {
  const [open, setOpen] = useState(false)
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: lead.id, data: { lead } })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    borderLeftColor: lead.status?.color || '#cbd5e1',
    borderLeftWidth: '4px',
  }

  const isSlaWarning = lead.slaDeadline && !lead.slaBreached &&
    new Date(lead.slaDeadline) < new Date(Date.now() + 5 * 60_000)

  const stars = lead.probabilidadeEstrelas || 0
  const channel = CHANNEL_META[lead.canal] || CHANNEL_META.manual
  const ChannelIcon = channel.Icon
  const vendedora = lead.user

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onClick={e => { e.stopPropagation(); setOpen(true) }}
        className={`bg-white rounded-xl border border-gray-200 p-3 cursor-pointer select-none transition-all
          ${isDragging ? 'shadow-xl opacity-90 rotate-1 scale-[1.02]' : 'shadow-sm hover:shadow-md hover:-translate-y-0.5'}
          ${lead.slaBreached ? 'ring-1 ring-red-200 bg-red-50/40' : ''}
        `}
      >
        {/* Topo: avatar + nome/produto + valor */}
        <div className="flex items-start gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0 flex items-center justify-center text-xs font-semibold text-gray-600">
            {getInitials(lead.nomeCliente)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-gray-900 truncate leading-tight">{lead.nomeCliente}</p>
            {lead.produtoInteresse && (
              <p className="text-xs text-gray-400 truncate mt-0.5">{lead.produtoInteresse}</p>
            )}
          </div>
          {lead.valorNegociacao && (
            <span className="text-xs font-semibold text-emerald-600 flex-shrink-0 mt-0.5">
              {formatCurrency(lead.valorNegociacao)}
            </span>
          )}
        </div>

        {/* 5 estrelas — sempre visíveis */}
        <div className="flex gap-0.5 mb-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Star
              key={i}
              size={12}
              className={i <= stars ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
            />
          ))}
        </div>

        {/* Próxima ação */}
        {lead.proximaAcao && (
          <div className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 rounded-lg px-2 py-1 mb-2 truncate">
            <ArrowRight size={11} className="flex-shrink-0" />
            <span className="truncate">{lead.proximaAcao}</span>
          </div>
        )}

        {lead.telefone && (
          <p className="text-[11px] text-gray-500 mt-2 font-mono tracking-tight">
            {lead.telefone}
          </p>
        )}

        {/* Footer: vendedora + canal + tempo + sla */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Vendedora */}
            {vendedora ? (
              vendedora.photoUrl ? (
                <img
                  src={vendedora.photoUrl}
                  alt={vendedora.name}
                  title={vendedora.name}
                  className="w-6 h-6 rounded-full object-cover border border-gray-100 flex-shrink-0"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div
                  title={vendedora.name}
                  className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-semibold text-blue-700 flex-shrink-0"
                >
                  {getInitials(vendedora.name)}
                </div>
              )
            ) : (
              <div title="Sem vendedora atribuída" className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <User size={11} className="text-gray-400" />
              </div>
            )}

            {/* Canal */}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${channel.bg}`} title={channel.label}>
              <ChannelIcon size={12} className={channel.color} />
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {lead.slaBreached ? (
              <span className="flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
                <AlertCircle size={10} />
                SLA
              </span>
            ) : isSlaWarning ? (
              <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                <AlertCircle size={10} />
              </span>
            ) : null}
            <span className="text-[11px] text-gray-400 whitespace-nowrap">
              {lead.createdAt
                ? formatDistanceToNow(new Date(lead.createdAt), { locale: ptBR, addSuffix: false })
                : ''}
            </span>
          </div>
        </div>
      </div>

      {open && <LeadModal lead={lead} onClose={() => setOpen(false)} />}
    </>
  )
}
