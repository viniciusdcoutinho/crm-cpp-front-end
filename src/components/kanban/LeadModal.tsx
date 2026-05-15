import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { X, Star, Phone, MessageCircle, Send, Users as UsersIcon, Clock, Edit3, Archive, ArchiveRestore, Play, FileText, RotateCcw, AlertCircle, Check } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { leadsApi, statusesApi, lossReasonsApi, usersApi, contactsApi } from '../../lib/api'
import { useAuthStore } from '../../lib/store'

interface Props { lead: any; onClose: () => void }

export function LeadModal({ lead, onClose }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    nomeCliente:           lead.nomeCliente        || '',
    email:                 lead.email              || '',
    telefone:              lead.telefone           || '',
    produtoInteresse:      lead.produtoInteresse   || '',
    valorNegociacao:       lead.valorNegociacao    || '',
    dataFechamento:        lead.dataFechamento     || '',
    proximaAcao:           lead.proximaAcao        || '',
    probabilidadeEstrelas: lead.probabilidadeEstrelas || 0,
    motivoNaoVenda:        lead.motivoNaoVenda     || '',
    numeroOrcamentoVf:     lead.numeroOrcamentoVf  || '',
    resumo:                lead.resumo             || '',
    statusId:              lead.status?.id         || '',
  })

  const navigate = useNavigate()
  const currentUser = useAuthStore(s => s.user)
  const pipelineId: string | undefined = lead.pipeline?.id
  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses', pipelineId],
    queryFn:  () => statusesApi.list(pipelineId),
    enabled: !!pipelineId,
  })

  const contactId: string | undefined = lead.contact?.id
  const { data: contactDetail } = useQuery({
    queryKey: ['contact', contactId],
    queryFn:  () => contactId ? contactsApi.get(contactId) : Promise.resolve(null),
    enabled: !!contactId,
  })
  // Outros leads do mesmo contato (excluindo o atual)
  const otherLeads = (contactDetail?.leads ?? []).filter((l: any) => l.id !== lead.id)
  const { data: lossReasons = [] } = useQuery({ queryKey: ['loss-reasons'], queryFn: lossReasonsApi.list })
  const { data: vendedoras = [] } = useQuery({ queryKey: ['vendedoras'], queryFn: usersApi.vendedoras })
  const { data: history = [] }  = useQuery({
    queryKey: ['history', lead.id],
    queryFn:  () => leadsApi.history(lead.id),
  })
  const { data: interactions = [] } = useQuery({
    queryKey: ['interactions', lead.id],
    queryFn:  () => leadsApi.interactions(lead.id),
  })

  const [showTransfer, setShowTransfer] = useState(false)
  const isAdmin = currentUser?.role === 'admin'
  const transfer = useMutation({
    mutationFn: (userId: string) => leadsApi.update(lead.id, { userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      onClose()
    },
  })

  const archive = useMutation({
    mutationFn: () => lead.archived ? leadsApi.unarchive(lead.id) : leadsApi.archive(lead.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['perf-leads'] })
      onClose()
    },
  })

  const currentStatus = statuses.find((s: any) => s.id === form.statusId)
  // Motivo de nao venda eh editavel em qualquer status que nao seja "Fechado".
  // Vendedora pode pre-anotar motivo enquanto o lead ainda esta em negociacao,
  // e ele fica salvo pra quando/se mover pra Perdido.
  const showLossReason = currentStatus?.label?.toLowerCase() !== 'fechado'

  // Lista pra encaminhamento: vendedoras ativas, exceto a atual dona do lead
  const transferOptions = vendedoras.filter((v: any) =>
    v.id !== lead.user?.id && v.id !== currentUser?.userId
  )

  const update = useMutation({
    mutationFn: () => leadsApi.update(lead.id, {
      ...form,
      valorNegociacao: form.valorNegociacao ? Number(form.valorNegociacao) : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      onClose()
    },
  })

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const inputCls = 'w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
              lead.canal === 'ligacao' ? 'bg-blue-50' : 'bg-green-50'
            }`}>
              {lead.canal === 'ligacao'
                ? <Phone size={16} className="text-blue-500" />
                : <MessageCircle size={16} className="text-green-500" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-medium text-gray-900">{lead.nomeCliente}</h2>
                {lead.archived && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">
                    <Archive size={10} /> Arquivado
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {lead.createdAt && format(new Date(lead.createdAt), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Status */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={form.statusId} onChange={set('statusId')} className={inputCls}>
              {statuses.map((s: any) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Probabilidade */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Probabilidade de fechamento</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, probabilidadeEstrelas: i === f.probabilidadeEstrelas ? 0 : i }))}
                >
                  <Star
                    size={26}
                    className={i <= form.probabilidadeEstrelas
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-gray-200 fill-gray-200 hover:text-amber-200'}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Dados */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome</label>
              <input type="text" value={form.nomeCliente} onChange={set('nomeCliente')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Telefone</label>
              <input type="tel" value={form.telefone} onChange={set('telefone')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">E-mail</label>
              <input type="email" value={form.email} onChange={set('email')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Produto de interesse</label>
              <input type="text" value={form.produtoInteresse} onChange={set('produtoInteresse')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Valor da negociação (R$)</label>
              <input type="number" value={form.valorNegociacao} onChange={set('valorNegociacao')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nº orçamento Vende Fácil</label>
              <input type="text" value={form.numeroOrcamentoVf} onChange={set('numeroOrcamentoVf')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Data de fechamento</label>
              <input type="date" value={form.dataFechamento} onChange={set('dataFechamento')} className={inputCls} />
            </div>
          </div>

          {/* Próxima ação */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Próxima ação</label>
            <input
              type="text"
              value={form.proximaAcao}
              onChange={set('proximaAcao')}
              placeholder="Ex: Ligar amanhã às 14h"
              className={inputCls}
            />
          </div>

          {/* Resumo */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Resumo da negociação</label>
            <textarea
              rows={3}
              value={form.resumo}
              onChange={set('resumo')}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Histórico do contato */}
          {contactId && (
            <div className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <UsersIcon size={14} className="text-gray-500 flex-shrink-0" />
                  <p className="text-sm font-medium text-gray-700">Histórico do contato</p>
                </div>
                <button
                  type="button"
                  onClick={() => { onClose(); navigate('/contatos') }}
                  className="text-xs text-blue-600 hover:underline flex-shrink-0"
                >
                  Ver tudo
                </button>
              </div>
              {otherLeads.length === 0 ? (
                <p className="text-xs text-gray-400">Este é o primeiro lead deste contato.</p>
              ) : (
                <div className="space-y-1.5">
                  {otherLeads.slice(0, 5).map((l: any) => (
                    <div key={l.id} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: l.status?.color || '#888' }}
                      />
                      <span className="text-gray-400 flex-shrink-0">
                        {l.createdAt && format(new Date(l.createdAt), 'dd/MM/yy')}
                      </span>
                      <span className="text-gray-700 truncate flex-1">
                        {l.produtoInteresse || 'Lead'}
                      </span>
                      <span className="text-gray-500 whitespace-nowrap">{l.status?.label}</span>
                      {l.valorNegociacao && (
                        <span className="text-emerald-600 font-medium whitespace-nowrap">
                          R$ {Number(l.valorNegociacao).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>
                  ))}
                  {otherLeads.length > 5 && (
                    <p className="text-[11px] text-gray-400 mt-1">+ {otherLeads.length - 5} outros leads</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Encaminhar */}
          <div className="border border-gray-100 rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-700">Vendedora atribuída</p>
                <p className="text-xs text-gray-500 truncate">
                  {lead.user?.name ?? '— sem dono —'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTransfer(s => !s)}
                className="text-xs flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-full font-medium flex-shrink-0"
              >
                <Send size={12} /> {showTransfer ? 'Cancelar' : 'Encaminhar'}
              </button>
            </div>
            {showTransfer && (
              <div className="mt-3 space-y-2">
                {transferOptions.length === 0 && (
                  <p className="text-xs text-gray-400">Nenhuma outra vendedora ativa pra encaminhar.</p>
                )}
                {transferOptions.map((v: any) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      if (confirm(`Encaminhar este lead para ${v.name}?`)) transfer.mutate(v.id)
                    }}
                    disabled={transfer.isPending}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50 disabled:opacity-50 text-left"
                  >
                    {v.photoUrl ? (
                      <img src={v.photoUrl} alt={v.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-gray-100" onError={e => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-semibold text-blue-700 flex-shrink-0">
                        {v.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <span className="text-sm text-gray-700 flex-1 truncate">{v.name}</span>
                    <Send size={14} className="text-blue-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Motivo não venda — só em status final que não seja Fechado */}
          {showLossReason && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Motivo de não venda</label>
              <select value={form.motivoNaoVenda} onChange={set('motivoNaoVenda')} className={inputCls}>
                <option value="">Selecione um motivo</option>
                {lossReasons.map((r: any) => (
                  <option key={r.id} value={r.label}>{r.label}</option>
                ))}
                {form.motivoNaoVenda && !lossReasons.some((r: any) => r.label === form.motivoNaoVenda) && (
                  <option value={form.motivoNaoVenda}>{form.motivoNaoVenda} (legado)</option>
                )}
              </select>
            </div>
          )}

          {/* Timeline de interações */}
          {interactions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                <Clock size={12} /> Timeline ({interactions.length})
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {interactions.map((it: any, idx: number) => (
                  <InteractionItem
                    key={it.id}
                    interaction={it}
                    isFirst={idx === 0}
                    isAdmin={isAdmin}
                    leadId={lead.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Histórico de alterações */}
          {history.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                <Edit3 size={12} /> Alterações</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {history.map((h: any) => (
                  <div key={h.id} className="flex gap-2 text-xs text-gray-500">
                    <span className="text-gray-300 flex-shrink-0">
                      {h.changedAt && format(new Date(h.changedAt), 'dd/MM HH:mm')}
                    </span>
                    <span className="flex-shrink-0">{h.user?.name}</span>
                    <span>alterou <strong>{h.fieldChanged}</strong>:</span>
                    <span className="text-gray-400 truncate">{h.oldValue} → {h.newValue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex gap-3">
          {isAdmin && (
            lead.archived ? (
              <button
                onClick={() => archive.mutate()}
                disabled={archive.isPending}
                className="flex items-center justify-center gap-1.5 py-2.5 px-4 border border-blue-200 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 disabled:opacity-50 transition-colors"
                title="Desarquivar lead"
              >
                <ArchiveRestore size={14} />
                {archive.isPending ? 'Desarquivando...' : 'Desarquivar'}
              </button>
            ) : (
              <button
                onClick={() => {
                  if (confirm('Arquivar este lead? Ele some da listagem normal e nao conta em metricas. Voce pode desarquivar depois.')) {
                    archive.mutate()
                  }
                }}
                disabled={archive.isPending}
                className="flex items-center justify-center gap-1.5 py-2.5 px-4 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                title="Arquivar lead (some da listagem e do Performance)"
              >
                <Archive size={14} />
                {archive.isPending ? 'Arquivando...' : 'Arquivar'}
              </button>
            )
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => update.mutate()}
            disabled={update.isPending}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {update.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

const EVENT_LABELS: Record<string, string> = {
  chatinit:           'Chat iniciado',
  widgetinit:         'Widget aberto',
  chatinattendance:   'Chat atendido',
  chatterminated:     'Chat encerrado',
  oncall:             'Ligação atendida',
  queueanswer:        'Chamada atendida',
  clicktocallinit:    'Click-to-call iniciado',
  queuehangup:        'Chamada finalizada',
  closecall:          'Chamada encerrada',
  clicktocallhangup:  'Click-to-call encerrado',
  historical:         'Primeiro contato',
  manual:             'Manual',
}

function InteractionItem({
  interaction, isFirst, isAdmin, leadId,
}: {
  interaction: any; isFirst: boolean; isAdmin: boolean; leadId: string
}) {
  const qc = useQueryClient()
  const isCall = interaction.channelType === 'call'
  const isCallClose = isCall &&
    ['queuehangup', 'closecall', 'clicktocallhangup'].includes(interaction.eventType)
  const Icon = isCall ? Phone : MessageCircle
  const label = EVENT_LABELS[interaction.eventType] || interaction.eventType

  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)

  const fetchRecording = useMutation({
    mutationFn: () => leadsApi.recordingUrl(leadId, interaction.id),
    onSuccess: (data: any) => setAudioUrl(data.url),
    onError: (err: any) => alert(err?.response?.data?.error || 'Gravacao indisponivel'),
  })
  const reprocess = useMutation({
    mutationFn: () => leadsApi.reprocessRecording(leadId, interaction.id),
    onSuccess: () => {
      // Backend retorna 202 e roda async. Reinvalida apos alguns segundos
      // pra pegar o resultado (transcricao + resumo) - alternativa seria SSE.
      setTimeout(() => qc.invalidateQueries({ queryKey: ['interactions', leadId] }), 3000)
      setTimeout(() => qc.invalidateQueries({ queryKey: ['interactions', leadId] }), 8000)
      setTimeout(() => qc.invalidateQueries({ queryKey: ['interactions', leadId] }), 20000)
    },
  })

  const status = interaction.processingStatus
  const statusBadge = (() => {
    if (status === 'processed')        return { label: 'Analisado',  cls: 'bg-emerald-50 text-emerald-700' }
    if (status === 'processing')       return { label: 'Analisando…', cls: 'bg-blue-50 text-blue-700' }
    if (status === 'skipped_too_long') return { label: 'Muito longa', cls: 'bg-gray-100 text-gray-500' }
    if (status === 'error')            return { label: 'Erro',        cls: 'bg-red-50 text-red-700' }
    return null
  })()

  return (
    <div className="flex gap-2.5 text-xs">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
        isCall ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
      }`}>
        <Icon size={11} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`font-medium ${isFirst ? 'text-gray-900' : 'text-gray-700'}`}>
            {label}
          </span>
          <span className="text-gray-400">
            {interaction.startedAt && format(new Date(interaction.startedAt), "d/MM 'às' HH:mm", { locale: ptBR })}
          </span>
          {statusBadge && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusBadge.cls}`}>
              {statusBadge.label}
            </span>
          )}
        </div>

        {/* Acoes de gravacao - admin only em call-close */}
        {isAdmin && isCallClose && (
          <div className="flex items-center gap-1.5 mt-1">
            <button
              type="button"
              onClick={() => fetchRecording.mutate()}
              disabled={fetchRecording.isPending}
              className="flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-0.5 rounded-full disabled:opacity-50"
              title="Ouvir gravação"
            >
              <Play size={10} />
              {fetchRecording.isPending ? '...' : 'Ouvir'}
            </button>
            {interaction.notes && (
              <button
                type="button"
                onClick={() => setShowSummary(v => !v)}
                className="flex items-center gap-1 text-[11px] bg-amber-50 text-amber-700 hover:bg-amber-100 px-2 py-0.5 rounded-full"
                title="Ver resumo gerado pela IA"
              >
                <FileText size={10} />
                {showSummary ? 'Ocultar' : 'Resumo'}
              </button>
            )}
            <button
              type="button"
              onClick={() => { if (confirm('Reprocessar gravacao? Vai consumir creditos de IA.')) reprocess.mutate() }}
              disabled={reprocess.isPending || status === 'processing'}
              className="flex items-center gap-1 text-[11px] bg-gray-50 text-gray-600 hover:bg-gray-100 px-2 py-0.5 rounded-full disabled:opacity-50"
              title="Forçar nova análise pela IA"
            >
              <RotateCcw size={10} />
              {reprocess.isPending ? '...' : 'Reprocessar'}
            </button>
            {status === 'error' && interaction.processingError && (
              <span title={interaction.processingError} className="text-red-500">
                <AlertCircle size={11} />
              </span>
            )}
            {status === 'processed' && (
              <Check size={11} className="text-emerald-500" />
            )}
          </div>
        )}

        {/* Audio player inline */}
        {audioUrl && (
          <div className="mt-1.5">
            <audio
              controls
              autoPlay
              src={audioUrl}
              className="w-full h-8"
              onError={() => alert('Erro ao carregar gravação')}
            />
          </div>
        )}

        {/* Resumo completo expandido (ou linhas comprimidas) */}
        {interaction.notes && (
          <p className={`text-gray-500 mt-0.5 whitespace-pre-wrap leading-relaxed ${
            showSummary ? '' : 'line-clamp-2'
          }`}>
            {interaction.notes}
          </p>
        )}
        {interaction.user && (
          <p className="text-[11px] text-gray-400 mt-0.5">por {interaction.user.name}</p>
        )}
      </div>
    </div>
  )
}
