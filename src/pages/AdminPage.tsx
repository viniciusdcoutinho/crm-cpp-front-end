import { useState, useRef } from 'react'
import { Check, Circle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { performanceApi, adminApi, scriptsApi } from '../lib/api'
import { SCRIPT_TOKENS } from '../lib/scripts'
import { ChangePasswordModal } from '../components/shared/ChangePasswordModal'
import { PASSWORD_RULES, validatePassword } from '../lib/passwordPolicy'

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
  const [tab, setTab] = useState<'users' | 'pipelines' | 'statuses' | 'reasons' | 'scripts' | 'sla' | 'settings' | 'logs'>('users')
  const tabs = [
    { id: 'users',     label: 'Usuários' },
    { id: 'pipelines', label: 'Pipelines' },
    { id: 'statuses',  label: 'Status do kanban' },
    { id: 'reasons',   label: 'Motivos de não venda' },
    { id: 'scripts',   label: 'Scripts padrão' },
    { id: 'sla',       label: 'Config SLA' },
    { id: 'settings',  label: 'Configurações' },
    { id: 'logs',      label: 'Webhook logs' },
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
      {tab === 'users'     && <UsersTab />}
      {tab === 'pipelines' && <PipelinesTab />}
      {tab === 'statuses'  && <StatusesTab />}
      {tab === 'reasons'   && <LossReasonsTab />}
      {tab === 'scripts'   && <ScriptsTab />}
      {tab === 'sla'       && <SlaTab />}
      {tab === 'settings'  && <SettingsTab />}
      {tab === 'logs'      && <LogsTab />}
    </div>
  )
}

function SettingsTab() {
  const qc = useQueryClient()
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: adminApi.listSettings,
  })
  const toggle = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => adminApi.updateSetting(key, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-settings'] }),
  })

  if (isLoading) {
    return <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
  }
  if (settings.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">Nenhuma configuração disponível.</p>
  }

  return (
    <div className="space-y-3">
      {settings.map((s: any) => {
        const isBool = s.value === 'true' || s.value === 'false'
        const enabled = s.value === 'true'
        return (
          <div key={s.settingKey} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900">{prettifyKey(s.settingKey)}</p>
              {s.description && (
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{s.description}</p>
              )}
              {s.updatedBy?.name && (
                <p className="text-xs text-gray-400 mt-2">
                  Última alteração por <span className="font-medium">{s.updatedBy.name}</span>
                </p>
              )}
            </div>
            <div className="flex-shrink-0">
              {isBool ? (
                <ToggleSwitch
                  enabled={enabled}
                  disabled={toggle.isPending}
                  onChange={(next) => toggle.mutate({ key: s.settingKey, value: next ? 'true' : 'false' })}
                />
              ) : (
                <input
                  type="text"
                  defaultValue={s.value || ''}
                  onBlur={(e) => {
                    if (e.target.value !== (s.value || '')) {
                      toggle.mutate({ key: s.settingKey, value: e.target.value })
                    }
                  }}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ToggleSwitch({ enabled, disabled, onChange }: { enabled: boolean; disabled: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
        enabled ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function prettifyKey(key: string): string {
  const map: Record<string, string> = {
    require_vendedora_assignment: 'Exigir vendedora identificada para criar lead',
  }
  if (map[key]) return map[key]
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function UsersTab() {
  const qc = useQueryClient()
  const { data: users = [] }     = useQuery({ queryKey: ['admin-users'],     queryFn: adminApi.listUsers })
  const { data: pipelines = [] } = useQuery({ queryKey: ['admin-pipelines'], queryFn: adminApi.listPipelines })
  const emptyForm = {
    name: '', email: '', telefone: '', password: '', role: 'vendedora',
    opensAgentName: '', opensAgentPeer: '', opensUserId: '', mondayPersonId: '', photoUrl: '',
    pipelineIds: [] as string[], defaultPipelineId: '' as string,
  }
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [passwordFor, setPasswordFor] = useState<{ id: string; name: string } | null>(null)

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
  const unlock = useMutation({
    mutationFn: (id: string) => adminApi.unlockUser(id),
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
      pipelineIds: (u.pipelines || []).map((p: any) => p.id),
      defaultPipelineId: u.defaultPipeline?.id || '',
    })
    setShowForm(true)
  }

  const togglePipeline = (id: string) => {
    setForm(f => {
      const has = f.pipelineIds.includes(id)
      const next = has ? f.pipelineIds.filter(x => x !== id) : [...f.pipelineIds, id]
      // Se removeu o preferencial, limpa.
      const nextDefault = next.includes(f.defaultPipelineId) ? f.defaultPipelineId : ''
      return { ...f, pipelineIds: next, defaultPipelineId: nextDefault }
    })
  }

  const submit = () => {
    // Se o user tem 1 so pipeline, preferencial automaticamente eh esse;
    // se nenhum, preferencial null. Se 2+, respeita a escolha (vazio = null).
    const computedDefault = form.pipelineIds.length === 1
      ? form.pipelineIds[0]
      : (form.defaultPipelineId || null)
    if (editingId) {
      const { password: _p, email: _e, ...rest } = form
      update.mutate({ id: editingId, ...rest, defaultPipelineId: computedDefault })
    } else {
      const policyError = validatePassword(form.password)
      if (policyError) {
        alert(policyError)
        return
      }
      create.mutate({ ...form, defaultPipelineId: computedDefault })
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
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Senha</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className={inputCls} placeholder="Mais de 8 caracteres" />
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5">
                {PASSWORD_RULES.map(r => {
                  const ok = r.test(form.password)
                  return (
                    <li key={r.label} className={`text-[11px] flex items-center gap-1.5 ${
                      ok ? 'text-emerald-600' : 'text-gray-400'
                    }`}>
                      {ok ? <Check size={11} /> : <Circle size={9} />}
                      {r.label}
                    </li>
                  )
                })}
              </ul>
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
            <label className="block text-xs text-gray-500 mb-1">Foto</label>
            <div className="flex items-center gap-3">
              {form.photoUrl ? (
                <img
                  src={form.photoUrl}
                  alt="Preview"
                  key={form.photoUrl}
                  className="w-14 h-14 rounded-full object-cover border border-gray-200 flex-shrink-0"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
                  sem foto
                </div>
              )}
              <PhotoUpload
                userId={editingId}
                onUploaded={url => setForm(f => ({ ...f, photoUrl: url }))}
              />
            </div>
            {!editingId && (
              <p className="text-[11px] text-gray-400 mt-1">
                Salve o usuário primeiro pra habilitar o upload da foto.
              </p>
            )}
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Pipelines com acesso</label>
            {pipelines.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum pipeline cadastrado.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {pipelines.filter((p: any) => p.active).map((p: any) => {
                  const checked = form.pipelineIds.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePipeline(p.id)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        checked
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                      {checked && <span className="text-blue-500">✓</span>}
                    </button>
                  )
                })}
              </div>
            )}
            {form.pipelineIds.length > 1 && (
              <div className="mt-3">
                <label className="block text-xs text-gray-500 mb-1">Pipeline preferencial (abre como padrão)</label>
                <select
                  value={form.defaultPipelineId}
                  onChange={e => setForm(f => ({ ...f, defaultPipelineId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">(nenhum — escolhe o primeiro da lista)</option>
                  {pipelines
                    .filter((p: any) => form.pipelineIds.includes(p.id))
                    .map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
              </div>
            )}
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
                {u.role !== 'admin' && u.pipelines && u.pipelines.length > 0 && (
                  <p className="text-xs text-gray-400 truncate">
                    Pipelines: {u.pipelines.map((p: any) => p.name).join(', ')}
                    {u.defaultPipeline && <> · prefere {u.defaultPipeline.name}</>}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {u.locked && (
                <span
                  className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium uppercase tracking-wide"
                  title={u.lockedAt ? `Bloqueado em ${new Date(u.lockedAt).toLocaleString('pt-BR')}` : 'Bloqueado'}
                >
                  Bloqueado
                </span>
              )}
              {u.locked && (
                <button
                  onClick={() => { if (confirm(`Desbloquear o usuário "${u.name}"?`)) unlock.mutate(u.id) }}
                  className="text-xs text-blue-600 hover:underline px-2 py-1"
                >
                  Desbloquear
                </button>
              )}
              <button onClick={() => openEdit(u)} className="text-xs text-blue-600 hover:underline px-2 py-1">
                Editar
              </button>
              <button
                onClick={() => setPasswordFor({ id: u.id, name: u.name })}
                className="text-xs text-gray-600 hover:underline px-2 py-1"
              >
                Senha
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

      {passwordFor && (
        <ChangePasswordModal
          mode={{ kind: 'admin', userId: passwordFor.id, userName: passwordFor.name }}
          onClose={() => setPasswordFor(null)}
        />
      )}
    </div>
  )
}

function PhotoUpload({ userId, onUploaded }: { userId: string | null; onUploaded: (url: string) => void }) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  const upload = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => adminApi.uploadUserPhoto(id, file),
    onSuccess: (saved: any) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      if (saved?.photoUrl) onUploaded(saved.photoUrl)
      setError('')
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Falha no upload')
    },
  })

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Arquivo maior que 5MB.')
      return
    }
    upload.mutate({ id: userId, file })
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onPick}
        className="hidden"
      />
      <button
        type="button"
        disabled={!userId || upload.isPending}
        onClick={() => fileRef.current?.click()}
        className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {upload.isPending ? 'Enviando...' : (userId ? 'Enviar foto' : 'Salve o usuário primeiro')}
      </button>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}

function PipelinesTab() {
  const qc = useQueryClient()
  const { data: pipelines = [] } = useQuery({
    queryKey: ['admin-pipelines'],
    queryFn: adminApi.listPipelines,
  })

  const emptyForm = {
    name: '', slug: '', color: '#3b82f6',
    idTelefoniaOpens: '', idWhatsOpens: '',
  }
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const reset = () => { setShowForm(false); setEditingId(null); setForm(emptyForm) }

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['admin-pipelines'] })
    qc.invalidateQueries({ queryKey: ['my-pipelines'] })
  }

  const create = useMutation({
    mutationFn: (data: any) => adminApi.createPipeline(data),
    onSuccess: () => { invalidateAll(); reset() },
    onError: (err: any) => alert(err?.response?.data?.message || 'Erro ao criar pipeline'),
  })
  const update = useMutation({
    mutationFn: ({ id, ...data }: any) => adminApi.updatePipeline(id, data),
    onSuccess: () => { invalidateAll(); reset() },
  })
  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deletePipeline(id),
    onSuccess: () => invalidateAll(),
    onError: (err: any) => alert(err?.response?.data?.message || 'Erro ao excluir pipeline'),
  })
  const toggleActive = useMutation({
    mutationFn: ({ id, active }: any) => adminApi.updatePipeline(id, { active }),
    onSuccess: () => invalidateAll(),
  })
  const markDefault = useMutation({
    mutationFn: (id: string) => adminApi.updatePipeline(id, { isDefaultForWebhooks: true }),
    onSuccess: () => invalidateAll(),
  })

  const slugify = (s: string) =>
    s.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }
  const openEdit = (p: any) => {
    setEditingId(p.id)
    setForm({
      name: p.name || '',
      slug: p.slug || '',
      color: p.color || '#3b82f6',
      idTelefoniaOpens: p.idTelefoniaOpens || '',
      idWhatsOpens:     p.idWhatsOpens     || '',
    })
    setShowForm(true)
  }
  const submit = () => {
    if (editingId) {
      const { slug: _s, ...rest } = form
      update.mutate({ id: editingId, ...rest })
    } else {
      const payload = { ...form, slug: form.slug.trim() || slugify(form.name) }
      create.mutate(payload)
    }
  }

  const isEditing = editingId !== null
  const isPending = create.isPending || update.isPending
  const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100'

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{pipelines.length} pipeline(s)</p>
        <button onClick={() => showForm ? reset() : openCreate()} className="text-sm text-blue-600 hover:underline">
          {showForm ? 'Cancelar' : '+ Novo pipeline'}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({
                ...f,
                name: e.target.value,
                slug: !isEditing && !f.slug ? slugify(e.target.value) : f.slug,
              }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Slug{isEditing && ' (não editável)'}</label>
            <input
              type="text"
              value={form.slug}
              disabled={isEditing}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              className={`${inputCls} ${isEditing ? 'bg-gray-100 text-gray-500' : ''}`}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cor</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-9 w-12 rounded cursor-pointer border border-gray-200" />
              <input type="text" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div />
          <div>
            <label className="block text-xs text-gray-500 mb-1">ID Telefonia Opens</label>
            <input type="text" value={form.idTelefoniaOpens} onChange={e => setForm(f => ({ ...f, idTelefoniaOpens: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">ID WhatsApp Opens</label>
            <input type="text" value={form.idWhatsOpens} onChange={e => setForm(f => ({ ...f, idWhatsOpens: e.target.value }))} className={inputCls} />
          </div>

          {isEditing && editingId && (
            <>
              <div className="col-span-2 pt-3 border-t border-gray-200">
                <PipelineSlugsEditor pipelineId={editingId} />
              </div>
              <div className="col-span-2 pt-3 border-t border-gray-200">
                <PipelineDistributionEditor pipelineId={editingId} />
              </div>
            </>
          )}

          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button onClick={reset} className="text-sm text-gray-500 px-4 py-2">Cancelar</button>
            <button onClick={submit} disabled={isPending || !form.name.trim()} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isPending ? 'Salvando...' : (isEditing ? 'Salvar' : 'Criar')}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {pipelines.map((p: any) => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-3">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
              <p className="text-xs text-gray-400 truncate">
                {p.slug}
                {(p.idTelefoniaOpens || p.idWhatsOpens) && <> · </>}
                {p.idTelefoniaOpens && <>tel {p.idTelefoniaOpens} </>}
                {p.idWhatsOpens     && <>· wpp {p.idWhatsOpens}</>}
              </p>
            </div>
            {p.isDefaultForWebhooks ? (
              <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full whitespace-nowrap">webhooks ↓</span>
            ) : (
              <button onClick={() => markDefault.mutate(p.id)} className="text-[11px] text-gray-400 hover:text-blue-600 px-2" title="Marcar como destino dos webhooks">
                marcar webhooks
              </button>
            )}
            <button onClick={() => openEdit(p)} className="text-xs text-blue-600 hover:underline px-2 py-1">
              Editar
            </button>
            <button
              onClick={() => toggleActive.mutate({ id: p.id, active: !p.active })}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${p.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}
            >
              {p.active ? 'Ativo' : 'Inativo'}
            </button>
            {!p.isDefaultForWebhooks && (
              <button onClick={() => { if (confirm(`Excluir o pipeline "${p.name}"?`)) remove.mutate(p.id) }} className="text-xs text-red-500 hover:underline px-2 py-1">
                Excluir
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── PipelineSlugsEditor ──────────────────────────────────────────
function PipelineSlugsEditor({ pipelineId }: { pipelineId: string }) {
  const qc = useQueryClient()
  const { data: slugs = [] } = useQuery<{ slug: string }[]>({
    queryKey: ['pipeline-slugs', pipelineId],
    queryFn:  () => adminApi.listPipelineSlugs(pipelineId),
  })
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  const add = useMutation({
    mutationFn: (slug: string) => adminApi.addPipelineSlug(pipelineId, slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline-slugs', pipelineId] })
      setDraft(''); setError('')
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Erro ao adicionar slug')
    },
  })
  const remove = useMutation({
    mutationFn: (slug: string) => adminApi.deletePipelineSlug(pipelineId, slug),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline-slugs', pipelineId] }),
  })

  const submit = () => {
    const s = draft.trim()
    if (!s) return
    add.mutate(s)
  }

  return (
    <div>
      <label className="block text-xs text-gray-500 mb-2">
        Slugs de LP (roteamento RD Station)
      </label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {slugs.map(s => (
          <span key={s.slug} className="inline-flex items-center gap-1 text-xs bg-white border border-gray-200 rounded-full pl-2.5 pr-1 py-1">
            <span className="text-gray-700">{s.slug}</span>
            <button
              type="button"
              onClick={() => { if (confirm(`Remover "${s.slug}"?`)) remove.mutate(s.slug) }}
              className="w-4 h-4 rounded-full flex items-center justify-center text-gray-400 hover:bg-red-100 hover:text-red-500"
            >×</button>
          </span>
        ))}
        {slugs.length === 0 && (
          <p className="text-xs text-gray-400">Nenhum slug — webhook RD desse pipeline cai no default.</p>
        )}
      </div>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={draft}
          onChange={e => { setDraft(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), submit())}
          placeholder="lp-ares-de-alta-capacidade ou URL completa"
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <button
          type="button"
          onClick={submit}
          disabled={add.isPending || !draft.trim()}
          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {add.isPending ? '...' : '+ Adicionar'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

// ─── PipelineDistributionEditor ───────────────────────────────────
function PipelineDistributionEditor({ pipelineId }: { pipelineId: string }) {
  const qc = useQueryClient()
  const { data: rows = [] } = useQuery<any[]>({
    queryKey: ['pipeline-distribution', pipelineId],
    queryFn:  () => adminApi.listDistribution(pipelineId),
  })

  const queryKey = ['pipeline-distribution', pipelineId] as const
  const invalidate = () => qc.invalidateQueries({ queryKey })

  // Optimistic update: aplica a mudanca direto no cache antes da
  // mutation retornar, pra UI responder no clique sem "piscar". Se
  // o backend rejeitar (peso fora do range etc), reverte e mostra erro.
  const update = useMutation({
    mutationFn: ({ userId, data }: any) => adminApi.updateDistribution(pipelineId, userId, data),
    onMutate: async ({ userId, data }: any) => {
      await qc.cancelQueries({ queryKey })
      const previous = qc.getQueryData<any[]>(queryKey)
      qc.setQueryData<any[]>(queryKey, (old) =>
        old ? old.map(r => r.user.id === userId ? { ...r, ...data } : r) : old)
      return { previous }
    },
    onError: (err: any, _vars, ctx: any) => {
      if (ctx?.previous) qc.setQueryData(queryKey, ctx.previous)
      alert(err?.response?.data?.message || err?.response?.data?.error || 'Erro ao atualizar distribuição')
    },
    onSettled: invalidate,
  })
  const resetAll = useMutation({
    mutationFn: () => adminApi.resetDistribution(pipelineId),
    onSuccess: invalidate,
  })

  if (rows.length === 0) {
    return (
      <div>
        <label className="block text-xs text-gray-500 mb-2">Distribuição de leads</label>
        <p className="text-xs text-gray-400">
          Nenhuma vendedora vinculada a este pipeline. Adicione vendedoras na aba Usuários.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-gray-500">Distribuição de leads</label>
        <button
          type="button"
          onClick={() => { if (confirm('Resetar contadores de todos? Isso zera o histórico de distribuição.')) resetAll.mutate() }}
          className="text-[11px] text-gray-500 hover:text-red-600"
        >
          Resetar contadores
        </button>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 text-[10px] font-medium text-gray-500 uppercase">Vendedora</th>
              <th className="text-center px-3 py-2 text-[10px] font-medium text-gray-500 uppercase w-24">Recebe?</th>
              <th className="text-center px-3 py-2 text-[10px] font-medium text-gray-500 uppercase w-24">Peso</th>
              <th className="text-center px-3 py-2 text-[10px] font-medium text-gray-500 uppercase w-28">Contador</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r: any) => (
              <tr key={r.user.id}>
                <td className="px-3 py-2 text-gray-700 truncate">{r.user.name}</td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={!!r.receivesDistribution}
                    onChange={e => update.mutate({ userId: r.user.id, data: { receivesDistribution: e.target.checked } })}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={r.distributionWeight}
                    onChange={e => {
                      const v = Number(e.target.value)
                      if (v >= 1 && v <= 100) update.mutate({ userId: r.user.id, data: { distributionWeight: v } })
                    }}
                    className="w-16 text-sm border border-gray-200 rounded px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="number"
                    min={0}
                    value={r.assignmentsCount}
                    onChange={e => {
                      const v = Number(e.target.value)
                      if (v >= 0) update.mutate({ userId: r.user.id, data: { assignmentsCount: v } })
                    }}
                    className="w-20 text-sm border border-gray-200 rounded px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-gray-400 mt-1.5">
        Distribuição usa MIN(contador/peso). Vendedora nova é alinhada automaticamente ao habilitar.
      </p>
    </div>
  )
}

function StatusesTab() {
  const qc = useQueryClient()
  const { data: pipelines = [] } = useQuery({
    queryKey: ['admin-pipelines'],
    queryFn: adminApi.listPipelines,
  })
  const [pipelineId, setPipelineId] = useState<string>('')
  // Quando lista de pipelines chega, seleciona o primeiro ativo por default.
  if (!pipelineId && pipelines.length > 0) {
    const first = pipelines.find((p: any) => p.active) ?? pipelines[0]
    setPipelineId(first.id)
  }
  const { data: statuses = [] } = useQuery({
    queryKey: ['admin-statuses', pipelineId],
    queryFn:  () => adminApi.listStatuses(pipelineId),
    enabled: !!pipelineId,
  })
  const emptyForm = { label: '', color: '#3B8BD4', position: 0, isFinal: false }
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const reset = () => { setShowForm(false); setEditingId(null); setForm(emptyForm) }

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-statuses'] })
    qc.invalidateQueries({ queryKey: ['statuses'] })
  }

  const create = useMutation({
    mutationFn: (data: any) => adminApi.createStatus({ ...data, pipelineId }),
    onSuccess: () => { invalidate(); reset() },
  })
  const update = useMutation({
    mutationFn: ({ id, ...data }: any) => adminApi.updateStatus(id, data),
    onSuccess: () => { invalidate(); reset() },
  })
  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteStatus(id),
    onSuccess: () => invalidate(),
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

  if (pipelines.length === 0) {
    return <p className="text-sm text-gray-400">Crie um pipeline primeiro na aba Pipelines.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs text-gray-500">Pipeline:</label>
        <select
          value={pipelineId}
          onChange={e => { setPipelineId(e.target.value); reset() }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          {pipelines.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <p className="text-sm text-gray-600 flex-1">{statuses.length} status nesse funil</p>
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
    mutationFn: ({ id, ...data }: any) => adminApi.updateSla(id, data),
    // Optimistic pra toggle responder no clique sem esperar request.
    onMutate: async ({ id, ...data }: any) => {
      await qc.cancelQueries({ queryKey: ['sla'] })
      const previous = qc.getQueryData<any[]>(['sla'])
      qc.setQueryData<any[]>(['sla'], (old) =>
        old ? old.map(s => s.id === id ? { ...s, ...data } : s) : old)
      return { previous }
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.previous) qc.setQueryData(['sla'], ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['sla'] }),
  })

  return (
    <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
      {slas.map((s: any) => (
        <div key={s.id} className="flex items-center justify-between px-4 py-3 gap-3">
          <div className="min-w-0">
            <p className="text-sm text-gray-700 capitalize">{s.eventType.replace(/_/g, ' ')}</p>
            {!s.enabled && (
              <p className="text-[11px] text-gray-400">Desabilitado — novos leads não recebem deadline</p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="number"
                defaultValue={s.minutes}
                disabled={!s.enabled}
                onBlur={e => update.mutate({ id: s.id, minutes: Number(e.target.value) })}
                className={`w-20 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                  !s.enabled ? 'bg-gray-50 text-gray-400' : ''
                }`}
              />
              <span className="text-xs text-gray-400">min</span>
            </div>
            <button
              type="button"
              onClick={() => update.mutate({ id: s.id, enabled: !s.enabled })}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                s.enabled ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s.enabled ? 'Ativo' : 'Inativo'}
            </button>
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
