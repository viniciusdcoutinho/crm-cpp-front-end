import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { performanceApi, adminApi } from '../lib/api'

// ─── Performance Page ─────────────────────────────────────────
export function PerformancePage() {
  const { data: snapshots = [] } = useQuery({
    queryKey: ['snapshots'],
    queryFn:  () => performanceApi.snapshots({ days: 30 }),
  })

  const latest = snapshots[0]

  return (
    <div>
      <h1 className="text-xl font-medium text-gray-900 mb-6">Performance</h1>

      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Leads recebidos',   value: latest.leadsReceived },
            { label: 'Convertidos',        value: latest.leadsConverted },
            { label: 'Taxa de conversão',  value: `${Number(latest.conversionRate).toFixed(1)}%` },
            { label: 'Valor convertido',   value: `R$ ${Number(latest.totalValueConverted).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className="text-2xl font-medium text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-700">Histórico diário</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50">
                {['Data', 'Recebidos', 'Convertidos', 'Perdidos', 'Conversão', 'SLA breaks', 'Valor'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {snapshots.map((s: any) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 text-gray-600">{s.refDate}</td>
                  <td className="px-4 py-3">{s.leadsReceived}</td>
                  <td className="px-4 py-3 text-green-600">{s.leadsConverted}</td>
                  <td className="px-4 py-3 text-red-500">{s.leadsLost}</td>
                  <td className="px-4 py-3">{Number(s.conversionRate).toFixed(1)}%</td>
                  <td className="px-4 py-3">{s.slaBreaches}</td>
                  <td className="px-4 py-3 text-green-600">
                    R$ {Number(s.totalValueConverted).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {snapshots.length === 0 && (
            <p className="text-center text-gray-400 py-12 text-sm">Nenhum dado de performance ainda.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Admin Page ───────────────────────────────────────────────
export function AdminPage() {
  const [tab, setTab] = useState<'users' | 'statuses' | 'sla' | 'logs'>('users')
  const tabs = [
    { id: 'users',    label: 'Usuários' },
    { id: 'statuses', label: 'Status do kanban' },
    { id: 'sla',      label: 'Config SLA' },
    { id: 'logs',     label: 'Webhook logs' },
  ] as const

  return (
    <div>
      <h1 className="text-xl font-medium text-gray-900 mb-6">Administração</h1>
      <div className="flex gap-1 border-b border-gray-100 mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'users'    && <UsersTab />}
      {tab === 'statuses' && <StatusesTab />}
      {tab === 'sla'      && <SlaTab />}
      {tab === 'logs'     && <LogsTab />}
    </div>
  )
}

function UsersTab() {
  const qc = useQueryClient()
  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: adminApi.listUsers })
  const emptyForm = { name: '', email: '', password: '', role: 'vendedora', opensAgentName: '', opensAgentPeer: '', opensUserId: '', mondayPersonId: '' }
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const reset = () => { setShowForm(false); setEditingId(null); setForm(emptyForm) }

  const create = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); reset() },
  })
  const update = useMutation({
    mutationFn: ({ id, ...data }: any) => adminApi.updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); reset() },
  })
  const toggle = useMutation({
    mutationFn: ({ id, active }: any) => adminApi.updateUser(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (u: any) => {
    setEditingId(u.id)
    setForm({
      name: u.name || '', email: u.email || '', password: '',
      role: u.role || 'vendedora',
      opensAgentName: u.opensAgentName || '',
      opensAgentPeer: u.opensAgentPeer || '',
      opensUserId: u.opensUserId || '',
      mondayPersonId: u.mondayPersonId || '',
    })
    setShowForm(true)
  }

  const submit = () => {
    if (editingId) {
      const { password: _p, email: _e, ...rest } = form
      update.mutate({ id: editingId, ...rest })
    } else {
      create.mutate(form)
    }
  }

  const isEditing = editingId !== null
  const isPending = create.isPending || update.isPending

  const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100'

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{users.length} usuário(s)</p>
        <button onClick={() => showForm ? reset() : openCreate()} className="text-sm text-blue-600 hover:underline">
          {showForm ? 'Cancelar' : '+ Novo usuário'}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3">
          {isEditing && (
            <div className="col-span-2 text-xs text-gray-500 -mb-1">
              Editando <span className="font-medium text-gray-700">{form.email}</span>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nome</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">E-mail{isEditing && ' (não editável)'}</label>
            <input type="email" value={form.email} disabled={isEditing} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={`${inputCls} ${isEditing ? 'bg-gray-100 text-gray-500' : ''}`} />
          </div>
          {!isEditing && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Senha</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className={inputCls} />
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inputCls}>
              <option value="vendedora">Vendedora</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {([['Agente Opens (nome)', 'opensAgentName'], ['Ramal Opens', 'opensAgentPeer'], ['ID Opens (UUID)', 'opensUserId'], ['ID Monday', 'mondayPersonId']] as [string, string][]).map(([label, key]) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <input type="text" value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className={inputCls} />
            </div>
          ))}
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button onClick={reset} className="text-sm text-gray-500 px-4 py-2">Cancelar</button>
            <button onClick={submit} disabled={isPending} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isPending ? 'Salvando...' : (isEditing ? 'Salvar' : 'Criar')}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {users.map((u: any) => (
          <div key={u.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{u.name}</p>
              <p className="text-xs text-gray-400">{u.email} · {u.role}</p>
              {(u.opensAgentName || u.opensAgentPeer || u.opensUserId) && (
                <p className="text-xs text-gray-400">
                  Opens: {u.opensAgentName || '—'}
                  {u.opensAgentPeer && <> · ramal {u.opensAgentPeer}</>}
                  {u.opensUserId && <> · id {u.opensUserId}</>}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openEdit(u)} className="text-xs text-blue-600 hover:underline px-2 py-1">
                Editar
              </button>
              <button
                onClick={() => toggle.mutate({ id: u.id, active: !u.active })}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${u.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}
              >
                {u.active ? 'Ativo' : 'Inativo'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusesTab() {
  const { data: statuses = [] } = useQuery({ queryKey: ['statuses'], queryFn: adminApi.listStatuses })

  return (
    <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
      {statuses.map((s: any) => (
        <div key={s.id} className="flex items-center gap-3 px-4 py-3">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
          <p className="text-sm font-medium text-gray-900 flex-1">{s.label}</p>
          <span className="text-xs text-gray-400">posição {s.position}</span>
          {s.isFinal   && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">final</span>}
          {s.isDefault && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">padrão</span>}
        </div>
      ))}
    </div>
  )
}

function SlaTab() {
  const qc = useQueryClient()
  const { data: slas = [] } = useQuery({ queryKey: ['sla'], queryFn: adminApi.listSla })
  const update = useMutation({
    mutationFn: ({ id, minutes }: any) => adminApi.updateSla(id, { minutes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sla'] }),
  })

  return (
    <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
      {slas.map((s: any) => (
        <div key={s.id} className="flex items-center justify-between px-4 py-3">
          <p className="text-sm text-gray-700 capitalize">{s.eventType.replace(/_/g, ' ')}</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              defaultValue={s.minutes}
              onBlur={e => update.mutate({ id: s.id, minutes: Number(e.target.value) })}
              className="w-20 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <span className="text-xs text-gray-400">min</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function LogsTab() {
  const [source, setSource] = useState('opens')
  const { data: logs = [] } = useQuery({
    queryKey: ['webhook-logs', source],
    queryFn:  () => adminApi.webhookLogs(source),
  })

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['opens', 'monday'].map(s => (
          <button key={s} onClick={() => setSource(s)}
            className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
              source === s ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {s}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {logs.map((log: any) => (
          <div key={log.id} className="px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                log.status === 'processed' ? 'bg-green-50 text-green-600' :
                log.status === 'error'     ? 'bg-red-50 text-red-600' :
                'bg-gray-100 text-gray-500'
              }`}>{log.status}</span>
              <span className="text-xs font-medium text-gray-700">{log.eventType}</span>
              <span className="text-xs text-gray-400 ml-auto">{log.receivedAt}</span>
            </div>
            {log.errorMsg && <p className="text-xs text-red-500">{log.errorMsg}</p>}
          </div>
        ))}
        {logs.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">Nenhum log.</p>}
      </div>
    </div>
  )
}
