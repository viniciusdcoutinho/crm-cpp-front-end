import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { performanceApi, adminApi, scriptsApi } from '../lib/api'
import { SCRIPT_TOKENS } from '../lib/scripts'

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
  const [tab, setTab] = useState<'users' | 'statuses' | 'reasons' | 'scripts' | 'sla' | 'logs'>('users')
  const tabs = [
    { id: 'users',    label: 'Usuários' },
    { id: 'statuses', label: 'Status do kanban' },
    { id: 'reasons',  label: 'Motivos de não venda' },
    { id: 'scripts',  label: 'Scripts padrão' },
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
      {tab === 'reasons'  && <LossReasonsTab />}
      {tab === 'scripts'  && <ScriptsTab />}
      {tab === 'sla'      && <SlaTab />}
      {tab === 'logs'     && <LogsTab />}
    </div>
  )
}

function UsersTab() {
  const qc = useQueryClient()
  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: adminApi.listUsers })
  const emptyForm = { name: '', email: '', telefone: '', password: '', role: 'vendedora', opensAgentName: '', opensAgentPeer: '', opensUserId: '', mondayPersonId: '', photoUrl: '' }
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
      name: u.name || '', email: u.email || '', telefone: u.telefone || '', password: '',
      role: u.role || 'vendedora',
      opensAgentName: u.opensAgentName || '',
      opensAgentPeer: u.opensAgentPeer || '',
      opensUserId: u.opensUserId || '',
      mondayPersonId: u.mondayPersonId || '',
      photoUrl: u.photoUrl || '',
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
          <div>
            <label className="block text-xs text-gray-500 mb-1">Telefone</label>
            <input type="tel" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="Ex: (62) 99999-0000" className={inputCls} />
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
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Foto (URL)</label>
            <div className="flex items-center gap-3">
              <input type="url" placeholder="https://..." value={form.photoUrl} onChange={e => setForm(f => ({ ...f, photoUrl: e.target.value }))} className={inputCls} />
              {form.photoUrl && (
                <img src={form.photoUrl} alt="Preview" className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0" onError={e => (e.currentTarget.style.display = 'none')} />
              )}
            </div>
          </div>
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
          <div key={u.id} className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {u.photoUrl ? (
                <img src={u.photoUrl} alt={u.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-100" onError={e => { e.currentTarget.style.display = 'none' }} />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm font-medium flex-shrink-0">
                  {u.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                <p className="text-xs text-gray-400 truncate">{u.email} · {u.role}</p>
                {(u.opensAgentName || u.opensAgentPeer || u.opensUserId) && (
                  <p className="text-xs text-gray-400 truncate">
                    Opens: {u.opensAgentName || '—'}
                    {u.opensAgentPeer && <> · ramal {u.opensAgentPeer}</>}
                    {u.opensUserId && <> · id {u.opensUserId}</>}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
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
  const qc = useQueryClient()
  const { data: statuses = [] } = useQuery({ queryKey: ['statuses'], queryFn: adminApi.listStatuses })
  const emptyForm = { label: '', color: '#3B8BD4', position: 0, isFinal: false }
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const reset = () => { setShowForm(false); setEditingId(null); setForm(emptyForm) }

  const create = useMutation({
    mutationFn: adminApi.createStatus,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['statuses'] }); reset() },
  })
  const update = useMutation({
    mutationFn: ({ id, ...data }: any) => adminApi.updateStatus(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['statuses'] }); reset() },
  })
  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteStatus(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['statuses'] }),
    onError: (err: any) => alert(err?.response?.data?.message || err?.response?.data?.error || 'Erro ao excluir status'),
  })

  const openCreate = () => {
    setEditingId(null)
    const nextPos = statuses.length > 0 ? Math.max(...statuses.map((s: any) => s.position)) + 1 : 0
    setForm({ ...emptyForm, position: nextPos })
    setShowForm(true)
  }

  const openEdit = (s: any) => {
    setEditingId(s.id)
    setForm({ label: s.label || '', color: s.color || '#3B8BD4', position: s.position ?? 0, isFinal: !!s.isFinal })
    setShowForm(true)
  }

  const submit = () => {
    if (editingId) update.mutate({ id: editingId, ...form })
    else create.mutate(form)
  }

  const isEditing = editingId !== null
  const isPending = create.isPending || update.isPending
  const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100'

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{statuses.length} status</p>
        <button onClick={() => showForm ? reset() : openCreate()} className="text-sm text-blue-600 hover:underline">
          {showForm ? 'Cancelar' : '+ Novo status'}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nome</label>
            <input type="text" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cor</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-9 w-12 rounded cursor-pointer border border-gray-200" />
              <input type="text" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Posição</label>
            <input type="number" value={form.position} onChange={e => setForm(f => ({ ...f, position: Number(e.target.value) }))} className={inputCls} />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input id="status-isfinal" type="checkbox" checked={form.isFinal} onChange={e => setForm(f => ({ ...f, isFinal: e.target.checked }))} />
            <label htmlFor="status-isfinal" className="text-sm text-gray-700">Status final (Fechado/Perdido)</label>
          </div>
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button onClick={reset} className="text-sm text-gray-500 px-4 py-2">Cancelar</button>
            <button onClick={submit} disabled={isPending || !form.label.trim()} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isPending ? 'Salvando...' : (isEditing ? 'Salvar' : 'Criar')}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {statuses.map((s: any) => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <p className="text-sm font-medium text-gray-900 flex-1 truncate">{s.label}</p>
            <span className="text-xs text-gray-400 hidden sm:inline">pos {s.position}</span>
            {s.isFinal   && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">final</span>}
            {s.isDefault && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">padrão</span>}
            <button onClick={() => openEdit(s)} className="text-xs text-blue-600 hover:underline px-2 py-1">
              Editar
            </button>
            {!s.isDefault && (
              <button onClick={() => { if (confirm(`Excluir o status "${s.label}"?`)) remove.mutate(s.id) }} className="text-xs text-red-500 hover:underline px-2 py-1">
                Excluir
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function LossReasonsTab() {
  const qc = useQueryClient()
  const { data: reasons = [] } = useQuery({ queryKey: ['loss-reasons'], queryFn: adminApi.listLossReasons })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ label: '', active: true })

  const reset = () => { setShowForm(false); setEditingId(null); setForm({ label: '', active: true }) }

  const create = useMutation({
    mutationFn: adminApi.createLossReason,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loss-reasons'] }); reset() },
  })
  const update = useMutation({
    mutationFn: ({ id, ...data }: any) => adminApi.updateLossReason(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loss-reasons'] }); reset() },
  })
  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteLossReason(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loss-reasons'] }),
  })
  const toggle = useMutation({
    mutationFn: ({ id, active }: any) => adminApi.updateLossReason(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loss-reasons'] }),
  })

  const openCreate = () => { setEditingId(null); setForm({ label: '', active: true }); setShowForm(true) }
  const openEdit = (r: any) => { setEditingId(r.id); setForm({ label: r.label || '', active: !!r.active }); setShowForm(true) }

  const submit = () => {
    if (editingId) update.mutate({ id: editingId, label: form.label, active: form.active })
    else create.mutate({ label: form.label })
  }

  const isEditing = editingId !== null
  const isPending = create.isPending || update.isPending
  const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100'

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{reasons.length} motivo(s)</p>
        <button onClick={() => showForm ? reset() : openCreate()} className="text-sm text-blue-600 hover:underline">
          {showForm ? 'Cancelar' : '+ Novo motivo'}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4 grid gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Motivo</label>
            <input type="text" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Ex: Sem orçamento" className={inputCls} />
          </div>
          {isEditing && (
            <div className="flex items-center gap-2">
              <input id="reason-active" type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
              <label htmlFor="reason-active" className="text-sm text-gray-700">Ativo (aparece no dropdown da vendedora)</label>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={reset} className="text-sm text-gray-500 px-4 py-2">Cancelar</button>
            <button onClick={submit} disabled={isPending || !form.label.trim()} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isPending ? 'Salvando...' : (isEditing ? 'Salvar' : 'Criar')}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {reasons.map((r: any) => (
          <div key={r.id} className="flex items-center gap-3 px-4 py-3">
            <p className={`text-sm flex-1 truncate ${r.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{r.label}</p>
            <span className="text-xs text-gray-400 hidden sm:inline">pos {r.position}</span>
            <button onClick={() => toggle.mutate({ id: r.id, active: !r.active })} className={`text-xs px-3 py-1 rounded-full transition-colors ${r.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              {r.active ? 'Ativo' : 'Inativo'}
            </button>
            <button onClick={() => openEdit(r)} className="text-xs text-blue-600 hover:underline px-2 py-1">Editar</button>
            <button onClick={() => { if (confirm(`Excluir o motivo "${r.label}"?`)) remove.mutate(r.id) }} className="text-xs text-red-500 hover:underline px-2 py-1">Excluir</button>
          </div>
        ))}
        {reasons.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">Nenhum motivo cadastrado.</p>}
      </div>
    </div>
  )
}

function ScriptsTab() {
  const qc = useQueryClient()
  const { data: scripts = [] } = useQuery({ queryKey: ['admin-global-scripts'], queryFn: adminApi.listGlobalScripts })
  const { data: categories = [] } = useQuery({ queryKey: ['script-categories'], queryFn: scriptsApi.categories })
  const emptyForm = { categoryId: '', title: '', content: '', active: true }
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  const insertToken = (token: string) => {
    const ta = contentRef.current
    const cur = form.content
    if (!ta) {
      setForm(f => ({ ...f, content: cur + token }))
      return
    }
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const next  = cur.slice(0, start) + token + cur.slice(end)
    setForm(f => ({ ...f, content: next }))
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + token.length, start + token.length)
    }, 0)
  }

  const reset = () => { setShowForm(false); setEditingId(null); setForm(emptyForm) }

  const create = useMutation({
    mutationFn: adminApi.createGlobalScript,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-global-scripts'] }); qc.invalidateQueries({ queryKey: ['scripts'] }); reset() },
  })
  const update = useMutation({
    mutationFn: ({ id, ...data }: any) => adminApi.updateGlobalScript(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-global-scripts'] }); qc.invalidateQueries({ queryKey: ['scripts'] }); reset() },
  })
  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteGlobalScript(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-global-scripts'] }); qc.invalidateQueries({ queryKey: ['scripts'] }) },
  })
  const toggle = useMutation({
    mutationFn: ({ id, active }: any) => adminApi.updateGlobalScript(id, { active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-global-scripts'] }); qc.invalidateQueries({ queryKey: ['scripts'] }) },
  })

  const openCreate = () => { setEditingId(null); setForm({ ...emptyForm, categoryId: categories[0]?.id || '' }); setShowForm(true) }
  const openEdit = (s: any) => {
    setEditingId(s.id)
    setForm({ categoryId: s.category?.id || '', title: s.title || '', content: s.content || '', active: !!s.active })
    setShowForm(true)
  }

  const submit = () => {
    if (!form.categoryId || !form.title.trim() || !form.content.trim()) return
    if (editingId) update.mutate({ id: editingId, ...form })
    else create.mutate({ categoryId: form.categoryId, title: form.title, content: form.content })
  }

  const isEditing = editingId !== null
  const isPending = create.isPending || update.isPending
  const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100'

  // Agrupar por categoria
  const byCategory = categories.map((c: any) => ({
    cat: c,
    items: scripts.filter((s: any) => s.category?.id === c.id),
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-gray-600">
          {scripts.length} script{scripts.length === 1 ? '' : 's'} padrão · visíveis para todas as vendedoras
        </p>
        <button onClick={() => showForm ? reset() : openCreate()} className="text-sm text-blue-600 hover:underline whitespace-nowrap">
          {showForm ? 'Cancelar' : '+ Novo script'}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Categoria</label>
              <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))} className={inputCls}>
                <option value="">Selecione...</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Título</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Primeira mensagem WhatsApp" className={inputCls} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs text-gray-500">Conteúdo</label>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-gray-400 mr-1">Inserir:</span>
                {SCRIPT_TOKENS.map(tok => (
                  <button
                    key={tok}
                    type="button"
                    onClick={() => insertToken(tok)}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100"
                    title={`Substituido pelos dados da vendedora logada quando ela visualiza o script`}
                  >
                    {tok}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              ref={contentRef}
              rows={5}
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Texto do script. Use [nome], [email] e [telefone] como variaveis."
              className={`${inputCls} resize-y`}
            />
          </div>
          {isEditing && (
            <div className="flex items-center gap-2">
              <input id="script-active" type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
              <label htmlFor="script-active" className="text-sm text-gray-700">Ativo (aparece para as vendedoras)</label>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={reset} className="text-sm text-gray-500 px-4 py-2">Cancelar</button>
            <button
              onClick={submit}
              disabled={isPending || !form.categoryId || !form.title.trim() || !form.content.trim()}
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Salvando...' : (isEditing ? 'Salvar' : 'Criar')}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {byCategory.map(({ cat, items }: any) => (
          <div key={cat.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">{cat.label}</p>
              <span className="text-xs text-gray-400">{items.length}</span>
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-4 text-sm text-gray-400">Nenhum script padrão nesta categoria.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {items.map((s: any) => (
                  <div key={s.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${s.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                          {s.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap line-clamp-2">{s.content}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => toggle.mutate({ id: s.id, active: !s.active })}
                          className={`text-xs px-3 py-1 rounded-full transition-colors ${s.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}
                        >
                          {s.active ? 'Ativo' : 'Inativo'}
                        </button>
                        <button onClick={() => openEdit(s)} className="text-xs text-blue-600 hover:underline px-2 py-1">Editar</button>
                        <button
                          onClick={() => { if (confirm(`Excluir o script "${s.title}"?`)) remove.mutate(s.id) }}
                          className="text-xs text-red-500 hover:underline px-2 py-1"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
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

type LogPreset = 'today' | 'yesterday' | 'week' | 'all' | 'custom'

// datetime-local usa formato YYYY-MM-DDTHH:mm sem timezone. ISO precisa de Z.
const toIso = (local: string) => local ? new Date(local).toISOString() : ''
const localOf = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function presetRange(preset: LogPreset): { from: string; to: string } {
  const now = new Date()
  if (preset === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    return { from: localOf(start), to: localOf(now) }
  }
  if (preset === 'yesterday') {
    const start = new Date(now); start.setDate(now.getDate() - 1); start.setHours(0, 0, 0, 0)
    const end = new Date(start); end.setHours(23, 59, 59, 999)
    return { from: localOf(start), to: localOf(end) }
  }
  if (preset === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - 7); start.setHours(0, 0, 0, 0)
    return { from: localOf(start), to: localOf(now) }
  }
  return { from: '', to: '' }
}

function LogsTab() {
  const [source, setSource]     = useState('opens')
  const [preset, setPreset]     = useState<LogPreset>('today')
  const [from, setFrom]         = useState(presetRange('today').from)
  const [to, setTo]             = useState(presetRange('today').to)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch]     = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [copied, setCopied]     = useState<string | null>(null)

  const setPresetAndRange = (p: LogPreset) => {
    setPreset(p)
    if (p !== 'custom') {
      const r = presetRange(p)
      setFrom(r.from); setTo(r.to)
    }
  }

  const { data: logs = [], isFetching } = useQuery({
    queryKey: ['webhook-logs', source, from, to, search],
    queryFn: () => adminApi.webhookLogs({
      source,
      dateFrom: toIso(from),
      dateTo:   toIso(to),
      search,
    }),
  })

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const copyPayload = (id: string, payload: string) => {
    const formatted = formatPayload(payload)
    navigator.clipboard.writeText(formatted)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  const inputCls = 'text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100'

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Source */}
          <div className="flex gap-1">
            {['opens', 'monday'].map(s => (
              <button key={s} onClick={() => setSource(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  source === s ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {s}
              </button>
            ))}
          </div>
          <div className="w-px h-6 bg-gray-200" />
          {/* Period preset */}
          {([
            { id: 'today',     label: 'Hoje' },
            { id: 'yesterday', label: 'Ontem' },
            { id: 'week',      label: 'Última semana' },
            { id: 'all',       label: 'Todos' },
            { id: 'custom',    label: 'Personalizado' },
          ] as { id: LogPreset; label: string }[]).map(p => (
            <button key={p.id} onClick={() => setPresetAndRange(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                preset === p.id ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-gray-500">De</label>
            <input type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} />
            <label className="text-xs text-gray-500">até</label>
            <input type="datetime-local" value={to} onChange={e => setTo(e.target.value)} className={inputCls} />
          </div>
        )}
        {/* Search */}
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setSearch(searchInput.trim())}
            placeholder='Pesquisar no payload (ex: "agentPeer", "62999", id...)'
            className={`${inputCls} flex-1`}
          />
          <button
            onClick={() => setSearch(searchInput.trim())}
            className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700"
          >
            Buscar
          </button>
          {search && (
            <button
              onClick={() => { setSearchInput(''); setSearch('') }}
              className="text-xs text-gray-500 hover:text-gray-700 px-2"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {isFetching && logs.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">Carregando...</p>
        )}
        {!isFetching && logs.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">Nenhum log encontrado nesse filtro.</p>
        )}
        {logs.map((log: any) => {
          const isExpanded = expanded.has(log.id)
          return (
            <div key={log.id} className="px-4 py-3">
              <button
                onClick={() => toggleExpand(log.id)}
                className="w-full text-left flex items-center gap-2 hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg"
              >
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  log.status === 'processed' ? 'bg-green-50 text-green-600' :
                  log.status === 'error'     ? 'bg-red-50 text-red-600' :
                  'bg-gray-100 text-gray-500'
                }`}>{log.status}</span>
                <span className="text-xs font-medium text-gray-700">{log.eventType}</span>
                <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
                  {log.receivedAt && new Date(log.receivedAt).toLocaleString('pt-BR')}
                </span>
                <span className="text-xs text-blue-600">{isExpanded ? '−' : '+'}</span>
              </button>

              {log.errorMsg && (
                <p className="text-xs text-red-500 mt-1 ml-1">{log.errorMsg}</p>
              )}

              {isExpanded && (
                <div className="mt-3 ml-1 space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">Payload</p>
                    <button
                      onClick={() => copyPayload(log.id, log.payload)}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {copied === log.id ? '✓ copiado' : 'Copiar JSON'}
                    </button>
                  </div>
                  <pre className="text-xs bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap break-all">
                    {formatPayload(log.payload)}
                  </pre>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatPayload(payload: any): string {
  if (payload == null) return '(vazio)'
  if (typeof payload === 'object') return JSON.stringify(payload, null, 2)
  if (typeof payload === 'string') {
    try { return JSON.stringify(JSON.parse(payload), null, 2) }
    catch { return payload }
  }
  return String(payload)
}
