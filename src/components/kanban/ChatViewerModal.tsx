import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, MessageCircle, Mic, Image as ImageIcon, FileWarning } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { leadsApi } from '../../lib/api'

interface Props {
  leadId: string
  clienteName?: string
  onClose: () => void
}

/**
 * Visualizacao tipo WhatsApp da conversa de um lead. Cliente do lado
 * esquerdo (bolha cinza), vendedora do lado direito (bolha verde).
 * Bot/sistema aparecem em cinza claro centralizado se "mostrar tudo".
 *
 * Audio/imagem inline. Imagens de cliente (lookaside.fbsbx.com) podem
 * expirar e nao carregar - mostramos placeholder.
 *
 * Poll a cada 5s pra atualizar a conversa em tempo "quase real" enquanto
 * o admin esta com o modal aberto.
 */
export function ChatViewerModal({ leadId, clienteName, onClose }: Props) {
  const [showAll, setShowAll] = useState(false)

  const { data: messages = [], isLoading } = useQuery<any[]>({
    queryKey: ['messages', leadId, showAll],
    queryFn:  () => leadsApi.messages(leadId, showAll),
    refetchInterval: 5_000,
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-emerald-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
              <MessageCircle size={18} />
            </div>
            <div>
              <h2 className="font-medium text-gray-900">Conversa</h2>
              <p className="text-xs text-gray-500">{clienteName || 'Cliente'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showAll}
                onChange={e => setShowAll(e.target.checked)}
                className="accent-emerald-500"
              />
              Mostrar bot/sistema
            </label>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Bolhas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gradient-to-b from-gray-50 to-white">
          {isLoading && (
            <p className="text-center text-sm text-gray-400 py-8">Carregando…</p>
          )}
          {!isLoading && messages.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">
              Nenhuma mensagem registrada nessa conversa.
            </p>
          )}
          {messages.map((m: any) => (
            <Bubble key={m.id} msg={m} />
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 text-[10px] text-gray-400 text-center">
          Mensagens são retidas por 60 dias. Mídia do cliente (WhatsApp) pode expirar após algumas horas.
        </div>
      </div>
    </div>
  )
}

function Bubble({ msg }: { msg: any }) {
  const isAgent  = msg.senderType === 'agent'
  const isClient = msg.senderType === 'client'
  const isSystem = msg.senderType === 'bot' || msg.senderType === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="bg-gray-100 text-gray-500 text-[11px] px-3 py-1 rounded-full max-w-[80%] text-center">
          {msg.messageBody || '(mensagem do sistema)'}
        </div>
      </div>
    )
  }

  const align    = isAgent ? 'justify-end' : 'justify-start'
  const bubbleCls = isAgent
    ? 'bg-emerald-100 text-gray-900'
    : 'bg-white border border-gray-200 text-gray-800'

  return (
    <div className={`flex ${align}`}>
      <div className={`${bubbleCls} rounded-2xl px-3 py-2 max-w-[75%] shadow-sm`}>
        {!isAgent && msg.senderName && (
          <p className="text-[10px] font-medium text-emerald-700 mb-0.5">{msg.senderName}</p>
        )}
        <MessageContent msg={msg} />
        <p className="text-[10px] text-gray-400 mt-1 text-right">
          {msg.sentAt && format(new Date(msg.sentAt), 'HH:mm', { locale: ptBR })}
        </p>
      </div>
    </div>
  )
}

function MessageContent({ msg }: { msg: any }) {
  const type = msg.messageType

  if (type === 'image' && msg.mediaUrl) {
    return (
      <div>
        <img
          src={msg.mediaUrl}
          alt="imagem"
          className="rounded-lg max-w-full max-h-64 cursor-pointer"
          onClick={() => window.open(msg.mediaUrl, '_blank')}
          onError={e => {
            (e.currentTarget as HTMLImageElement).style.display = 'none'
            const fb = e.currentTarget.nextElementSibling as HTMLElement
            if (fb) fb.style.display = 'flex'
          }}
        />
        <div className="hidden items-center gap-1.5 text-[11px] text-gray-500 italic mt-1">
          <FileWarning size={12} /> Imagem expirada
        </div>
      </div>
    )
  }

  if (type === 'audio' || type === 'voice') {
    return (
      <div className="flex items-center gap-2">
        <Mic size={14} className={msg.voiceNote ? 'text-emerald-600' : 'text-gray-500'} />
        <audio
          controls
          src={msg.mediaUrl}
          className="h-8 max-w-[240px]"
          onError={e => {
            (e.currentTarget as HTMLAudioElement).outerHTML = '<span class="text-[11px] text-gray-500 italic">áudio indisponível</span>'
          }}
        />
      </div>
    )
  }

  if (type === 'video' && msg.mediaUrl) {
    return (
      <video src={msg.mediaUrl} controls className="rounded-lg max-w-full max-h-64" />
    )
  }

  if (type !== 'text' && msg.mediaUrl) {
    return (
      <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-emerald-700 underline text-sm">
        <ImageIcon size={14} /> {msg.messageBody || 'Anexo'}
      </a>
    )
  }

  return (
    <p className="text-sm whitespace-pre-wrap leading-relaxed"
       dangerouslySetInnerHTML={{ __html: sanitize(msg.messageBody) }} />
  )
}

/**
 * Mensagens da Opens chegam com HTML simples (<b>...</b>). Permitimos
 * apenas tags de formatacao basica. Tudo mais eh escapado.
 */
function sanitize(raw: string): string {
  if (!raw) return ''
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped
    .replace(/&lt;b&gt;/g, '<b>').replace(/&lt;\/b&gt;/g, '</b>')
    .replace(/&lt;i&gt;/g, '<i>').replace(/&lt;\/i&gt;/g, '</i>')
    .replace(/&lt;br\s*\/?&gt;/g, '<br/>')
}
