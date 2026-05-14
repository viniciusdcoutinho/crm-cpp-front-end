import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Star } from 'lucide-react'
import { leadsApi, usersApi } from '../../lib/api'
import { useAuthStore } from '../../lib/store'

interface Props {
  pipelineId: string
  pipelineName: string
  onClose: () => void
}

/**
 * Cria um lead manualmente dentro do pipeline atual. Admin pode atribuir
 * a qualquer vendedora; vendedora cria automaticamente atribuido a si
 * mesma (campo escondido nesse caso).
 */
export function NewLeadModal({ pipelineId, pipelineName, onClose }: Props) {
  const qc = useQueryClient()
  const currentUser = useAuthStore(s => s.user)
  const isAdmin = currentUser?.role === 'admin'

  const { data: vendedoras = [] } = useQuery({
    queryKey: ['vendedoras'],
    queryFn:  usersApi.vendedoras,
    enabled: isAdmin,
  })

  const [form, setForm] = useState({
    nomeCliente: '',
    telefone: '',
    email: '',
    userId: '',
    produtoInteresse: '',
    valorNegociacao: '',
    proximaAcao: '',
    probabilidadeEstrelas: 0,
  })
  const [error, setError] = useState('')

  const create = useMutation({
    mutationFn: () => leadsApi.create({
      pipelineId,
      userId: form.userId || null,
      nomeCliente: form.nomeCliente.trim(),
      telefone: form.telefone.trim() || null,
      email: form.email.trim() || null,
      produtoInteresse: form.produtoInteresse.trim() || null,
      valorNegociacao: form.valorNegociacao ? Number(form.valorNegociacao) : null,
      proximaAcao: form.proximaAcao.trim() || null,
      probabilidadeEstrelas: form.probabilidadeEstrelas || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['perf-leads'] })
      onClose()
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Erro ao criar lead')
    },
  })

  const submit = () => {
    setError('')
    if (!form.nomeCliente.trim()) {
      setError('Nome do cliente é obrigatório.')
      return
    }
    create.mutate()
  }

  const inputCls = 'w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-medium text-gray-900">Novo lead</h2>
            <p className="text-xs text-gray-400">Pipeline: {pipelineName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nome do cliente *</label>
            <input
              type="text"
              autoFocus
              value={form.nomeCliente}
              onChange={e => setForm(f => ({ ...f, nomeCliente: e.target.value }))}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Telefone</label>
              <input
                type="tel"
                value={form.telefone}
                onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                placeholder="Ex: (62) 99999-0000"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          {isAdmin && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Vendedora</label>
              <select
                value={form.userId}
                onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}
                className={inputCls}
              >
                <option value="">— sem dono (admin pega) —</option>
                {vendedoras.map((v: any) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Produto de interesse</label>
              <input
                type="text"
                value={form.produtoInteresse}
                onChange={e => setForm(f => ({ ...f, produtoInteresse: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Valor da negociação (R$)</label>
              <input
                type="number"
                value={form.valorNegociacao}
                onChange={e => setForm(f => ({ ...f, valorNegociacao: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Próxima ação</label>
            <input
              type="text"
              value={form.proximaAcao}
              onChange={e => setForm(f => ({ ...f, proximaAcao: e.target.value }))}
              placeholder="Ex: Ligar amanhã às 14h"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">Probabilidade de fechamento</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setForm(f => ({
                    ...f,
                    probabilidadeEstrelas: i === f.probabilidadeEstrelas ? 0 : i,
                  }))}
                >
                  <Star
                    size={24}
                    className={i <= form.probabilidadeEstrelas
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-gray-200 fill-gray-200 hover:text-amber-200'}
                  />
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={create.isPending || !form.nomeCliente.trim()}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {create.isPending ? 'Criando...' : 'Criar lead'}
          </button>
        </div>
      </div>
    </div>
  )
}
