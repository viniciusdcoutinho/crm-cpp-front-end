import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, Check, ChevronDown, ChevronUp, Send, Bot, User, FileText, Sparkles, Plus, Trash2, X } from 'lucide-react'
import { scriptsApi, assistantApi } from '../lib/api'
import { useAuthStore } from '../lib/store'

interface Message { role: 'user' | 'assistant'; content: string }

export function AssistantPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-900">Assistente</h1>
        <p className="text-sm text-gray-500 mt-0.5">Scripts prontos e assistente de IA pra agilizar seus atendimentos</p>
      </div>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden min-h-0">
        <ScriptsPanel />
        <ChatPanel />
      </div>
    </div>
  )
}

function ScriptsPanel() {
  const qc = useQueryClient()
  const currentUser = useAuthStore(s => s.user)
  const { data: categories = [] } = useQuery({ queryKey: ['script-categories'], queryFn: scriptsApi.categories })
  const { data: scripts = [] }    = useQuery({ queryKey: ['scripts'],           queryFn: scriptsApi.list })
  const [openCat, setOpenCat]     = useState<string | null>(null)
  const [copied, setCopied]       = useState<string | null>(null)
  const [showForm, setShowForm]   = useState(false)
  const emptyForm = { categoryId: '', title: '', content: '' }
  const [form, setForm] = useState(emptyForm)

  const create = useMutation({
    mutationFn: scriptsApi.create,
    onSuccess: (created: any) => {
      qc.invalidateQueries({ queryKey: ['scripts'] })
      setShowForm(false)
      setForm(emptyForm)
      // abre a categoria do script recem-criado
      if (created?.category?.id) setOpenCat(created.category.id)
    },
  })
  const remove = useMutation({
    mutationFn: (id: string) => scriptsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scripts'] }),
  })

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const submit = () => {
    if (!form.categoryId || !form.title.trim() || !form.content.trim()) return
    create.mutate({ categoryId: form.categoryId, title: form.title.trim(), content: form.content.trim() })
  }

  const openCreate = () => {
    setForm({ ...emptyForm, categoryId: categories[0]?.id || '' })
    setShowForm(true)
  }

  const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100'

  return (
    <section className="flex flex-col overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm">
      <header className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
          <FileText size={18} className="text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-gray-900">Scripts de atendimento</h2>
          <p className="text-xs text-gray-500">Textos prontos por categoria · clique pra copiar</p>
        </div>
        <button
          onClick={() => showForm ? setShowForm(false) : openCreate()}
          className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-full transition-colors flex-shrink-0"
          title={showForm ? 'Cancelar' : 'Novo script pessoal'}
        >
          {showForm ? <><X size={12} /> Cancelar</> : <><Plus size={12} /> Novo</>}
        </button>
      </header>

      {showForm && (
        <div className="border-b border-gray-100 bg-gray-50 p-4 space-y-3">
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
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Saudação WhatsApp" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Conteúdo</label>
            <textarea
              rows={4}
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Texto do script. Pode usar quebras de linha."
              className={`${inputCls} resize-y`}
            />
          </div>
          <div className="flex justify-between items-center pt-1">
            <p className="text-xs text-gray-400">Visível só pra você</p>
            <button
              onClick={submit}
              disabled={create.isPending || !form.categoryId || !form.title.trim() || !form.content.trim()}
              className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {create.isPending ? 'Salvando...' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {categories.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Nenhuma categoria de script ainda.</p>
        )}
        {categories.map((cat: any) => {
          const catScripts = scripts.filter((s: any) => s.category?.id === cat.id)
          const isOpen = openCat === cat.id
          return (
            <div key={cat.id} className="border border-gray-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenCat(isOpen ? null : cat.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
              >
                <span>{cat.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                    {catScripts.length}
                  </span>
                  {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>
              {isOpen && (
                <div className="divide-y divide-gray-50 bg-white">
                  {catScripts.length === 0
                    ? <p className="p-4 text-sm text-gray-400">Nenhum script nesta categoria.</p>
                    : catScripts.map((s: any) => {
                        const isMine = s.scope === 'personal' && s.createdBy?.id === currentUser?.userId
                        return (
                          <div key={s.id} className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p className="text-sm font-medium text-gray-800">{s.title}</p>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {s.scope === 'global'
                                  ? <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">padrão</span>
                                  : <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">pessoal</span>
                                }
                                <button
                                  onClick={() => copy(s.id, s.content)}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                  title="Copiar"
                                >
                                  {copied === s.id
                                    ? <Check size={14} className="text-green-500" />
                                    : <Copy size={14} />}
                                </button>
                                {isMine && (
                                  <button
                                    onClick={() => { if (confirm(`Excluir o script "${s.title}"?`)) remove.mutate(s.id) }}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Excluir"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{s.content}</p>
                          </div>
                        )
                      })
                  }
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: 'Olá! Sou sua assistente de vendas. Posso te ajudar com seus leads, sugerir abordagens, tirar dúvidas sobre produtos e muito mais. Como posso ajudar?'
  }])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    setMessages(m => [...m, { role: 'user', content: msg }])
    setInput('')
    setLoading(true)
    try {
      const { response } = await assistantApi.chat(msg)
      setMessages(m => [...m, { role: 'assistant', content: response }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Desculpe, houve um erro. Tente novamente.' }])
    } finally {
      setLoading(false)
    }
  }

  const suggestions = [
    'Quais meus leads sem movimento?',
    'Quem tem maior chance de fechar?',
    'Sugira abordagem para follow-up',
  ]

  return (
    <section className="flex flex-col overflow-hidden bg-gradient-to-br from-blue-50/40 to-white rounded-2xl border border-blue-100 shadow-sm">
      <header className="flex items-center gap-3 px-5 py-4 border-b border-blue-100/60 bg-white/40">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Sparkles size={18} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-gray-900">Assistente IA</h2>
          <p className="text-xs text-gray-500">Pergunte sobre seus leads, produtos ou abordagens</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          online
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'assistant' ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              {msg.role === 'assistant'
                ? <Bot size={16} className="text-blue-600" />
                : <User size={16} className="text-gray-500" />}
            </div>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'assistant'
                ? 'bg-white text-gray-800 border border-gray-100'
                : 'bg-blue-600 text-white'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Bot size={16} className="text-blue-600" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex gap-1 items-center">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 bg-blue-300 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-blue-100/60 px-5 py-4 bg-white/60 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-xs border border-blue-200 bg-white rounded-full px-3 py-1.5 text-blue-700 hover:bg-blue-50 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Pergunte sobre seus leads, produtos..."
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition-colors flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </section>
  )
}
