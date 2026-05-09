import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Phone, Mail, ArrowLeft, Calendar, User as UserIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { contactsApi } from '../lib/api'
import { LeadModal } from '../components/kanban/LeadModal'

const formatBrl = (v: any) => {
  const n = Number(v)
  if (!n || isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ContactsPage() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // debounce simples no input de busca pra nao bater na API a cada tecla
  const onSearchChange = (v: string) => {
    setSearch(v)
    clearTimeout((onSearchChange as any)._t)
    ;(onSearchChange as any)._t = setTimeout(() => setDebounced(v.trim()), 300)
  }

  if (selectedId) {
    return <ContactDetail id={selectedId} onBack={() => setSelectedId(null)} />
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-900">Contatos</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Histórico unificado por cliente — todos os leads e interações no mesmo lugar.
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Buscar por nome, telefone ou email"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ContactsList search={debounced} onSelect={setSelectedId} />
      </div>
    </div>
  )
}

function ContactsList({ search, onSelect }: { search: string; onSelect: (id: string) => void }) {
  const { data: contacts = [], isFetching } = useQuery({
    queryKey: ['contacts', search],
    queryFn: () => contactsApi.list(search || undefined),
  })

  if (isFetching && contacts.length === 0) {
    return <p className="text-center text-gray-400 py-12 text-sm">Carregando...</p>
  }

  if (contacts.length === 0) {
    return <p className="text-center text-gray-400 py-12 text-sm">
      {search ? 'Nenhum contato encontrado.' : 'Nenhum contato ainda.'}
    </p>
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
      {contacts.map((c: any) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 flex-shrink-0">
            {c.nome?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">{c.nome || '— sem nome —'}</p>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
              {c.telefone && <span className="flex items-center gap-1"><Phone size={10} /> {c.telefone}</span>}
              {c.email    && <span className="flex items-center gap-1 truncate"><Mail size={10} /> {c.email}</span>}
            </div>
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
            atualizado {c.updatedAt && format(new Date(c.updatedAt), 'dd/MM/yy', { locale: ptBR })}
          </span>
        </button>
      ))}
    </div>
  )
}

function ContactDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => contactsApi.get(id),
  })
  const [openLead, setOpenLead] = useState<any>(null)

  if (isLoading || !data) {
    return <p className="text-center text-gray-400 py-12 text-sm">Carregando...</p>
  }

  const { contact, leads } = data
  const fechados = leads.filter((l: any) => l.status?.label?.toLowerCase() === 'fechado')
  const totalConvertido = fechados.reduce((acc: number, l: any) => acc + Number(l.valorNegociacao || 0), 0)

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4 self-start">
        <ArrowLeft size={14} /> Voltar
      </button>

      {/* Header do contato */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-2xl font-semibold text-gray-700 flex-shrink-0">
            {contact.nome?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-medium text-gray-900 truncate">{contact.nome || '— sem nome —'}</h2>
            <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-1">
              {contact.telefone && <span className="flex items-center gap-1.5"><Phone size={13} /> {contact.telefone}</span>}
              {contact.email    && <span className="flex items-center gap-1.5"><Mail size={13} /> {contact.email}</span>}
              {contact.createdAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} /> primeiro contato {format(new Date(contact.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Metric label="Total de leads" value={String(leads.length)} />
        <Metric label="Fechados" value={String(fechados.length)} accent="green" />
        <Metric label="Valor convertido" value={formatBrl(totalConvertido)} accent="green" />
      </div>

      {/* Leads do contato */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Histórico de leads</h3>
          <p className="text-xs text-gray-500">Clique em um lead para ver os detalhes</p>
        </div>
        {leads.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Nenhum lead ainda.</p>
        )}
        <div className="divide-y divide-gray-50">
          {leads.map((l: any) => (
            <button
              key={l.id}
              onClick={() => setOpenLead(l)}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 text-left"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: l.status?.color || '#888' }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800">
                    {l.produtoInteresse || l.nomeCliente || 'Lead'}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                    style={{ backgroundColor: (l.status?.color || '#888') + '20', color: l.status?.color || '#888' }}
                  >
                    {l.status?.label}
                  </span>
                  {l.user && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <UserIcon size={10} /> {l.user.name}
                    </span>
                  )}
                </div>
                {l.proximaAcao && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">→ {l.proximaAcao}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                {l.valorNegociacao && (
                  <p className="text-sm font-semibold text-emerald-600 whitespace-nowrap">{formatBrl(l.valorNegociacao)}</p>
                )}
                <p className="text-xs text-gray-400 whitespace-nowrap">
                  {l.createdAt && format(new Date(l.createdAt), 'dd/MM/yy', { locale: ptBR })}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {openLead && <LeadModal lead={openLead} onClose={() => setOpenLead(null)} />}
    </div>
  )
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: 'green' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-semibold ${accent === 'green' ? 'text-emerald-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  )
}
