import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X, KeyRound } from 'lucide-react'
import { adminApi, usersApi } from '../../lib/api'

type Mode =
  | { kind: 'self' }
  | { kind: 'admin'; userId: string; userName: string }

interface Props {
  mode: Mode
  onClose: () => void
}

/**
 * Modal de troca de senha. Dois modos:
 *  - self:  user logado trocando a propria senha (precisa senha atual);
 *  - admin: admin trocando senha de outro user (sem senha atual).
 */
export function ChangePasswordModal({ mode, onClose }: Props) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode.kind === 'self') {
        return usersApi.changePassword({ currentPassword, newPassword })
      }
      return adminApi.changeUserPassword(mode.userId, newPassword)
    },
    onSuccess: () => onClose(),
    onError: (err: any) => {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Falha ao trocar senha')
    },
  })

  const submit = () => {
    setError('')
    if (newPassword.length < 8) {
      setError('Nova senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    if (mode.kind === 'self' && !currentPassword) {
      setError('Informe a senha atual.')
      return
    }
    mutation.mutate()
  }

  const inputCls = 'w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
              <KeyRound size={16} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-medium text-gray-900">
                {mode.kind === 'self' ? 'Trocar minha senha' : 'Trocar senha'}
              </h2>
              {mode.kind === 'admin' && (
                <p className="text-xs text-gray-400">{mode.userName}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {mode.kind === 'self' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Senha atual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className={inputCls}
              />
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nova senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className={inputCls}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Confirmar nova senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className={inputCls}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
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
            disabled={mutation.isPending}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Trocando...' : 'Trocar senha'}
          </button>
        </div>
      </div>
    </div>
  )
}
