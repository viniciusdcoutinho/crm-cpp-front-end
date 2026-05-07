import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Star, Phone, MessageCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { leadsApi, statusesApi } from '../../lib/api'

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

  const { data: statuses = [] } = useQuery({ queryKey: ['statuses'], queryFn: statusesApi.list })
  const { data: history = [] }  = useQuery({
    queryKey: ['history', lead.id],
    queryFn:  () => leadsApi.history(lead.id),
  })

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
              <h2 className="font-medium text-gray-900">{lead.nomeCliente}</h2>
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

          {/* Motivo não venda */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Motivo de não venda</label>
            <input type="text" value={form.motivoNaoVenda} onChange={set('motivoNaoVenda')} className={inputCls} />
          </div>

          {/* Histórico */}
          {history.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Histórico de alterações</p>
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
