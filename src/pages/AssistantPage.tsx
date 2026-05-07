import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, Check, ChevronDown, ChevronUp, Send, Bot, User } from 'lucide-react'
import { scriptsApi, assistantApi } from '../lib/api'

interface Message { role: 'user' | 'assistant'; content: string }

export function AssistantPage() {
  return (
    <div className="h-full flex flex-col">
      <h1 className="text-xl font-medium text-gray-900 mb-6">Assistente</h1>
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        <ScriptsPanel />
        <ChatPanel />
      </div>
    </div>
  )
}

function ScriptsPanel() {
  const { data: categories = [] } = useQuery({ queryKey: ['script-categories'], queryFn: scriptsApi.categories })
  const { data: scripts = [] }    = useQuery({ queryKey: ['scripts'],           queryFn: scriptsApi.list })
  const [openCat, setOpenCat]     = useState<string | null>(null)
  const [copied, setCopied]       = useState<string | null>(null)

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="w-1/2 flex flex-col overflow-hidden">
      <p className="text-sm font-medium text-gray-700 mb-3">Scripts de atendimento</p>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
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
                <div className="divide-y divide-gray-50">
                  {catScripts.length === 0
                    ? <p className="p-4 text-sm text-gray-400">Nenhum script nesta categoria.</p>
                    : catScripts.map((s: any) => (
                      <div key={s.id} className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-medium text-gray-800">{s.title}</p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {s.scope === 'global' && (
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">padrão</span>
                            )}
                            <button
                              onClick={() => copy(s.id, s.content)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Copiar"
                            >
                              {copied === s.id
                                ? <Check size={14} className="text-green-500" />
                                : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{s.content}</p>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
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
    <div className="w-1/2 flex flex-col overflow-hidden">
      <p className="text-sm font-medium text-gray-700 mb-3">Assistente pessoal</p>

      <div className="flex-1 overflow-y-auto space-y-4 mb-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'assistant' ? 'bg-blue-50' : 'bg-gray-100'
            }`}>
              {msg.role === 'assistant'
                ? <Bot size={16} className="text-blue-500" />
                : <User size={16} className="text-gray-500" />}
            </div>
            <div className={`max-w-xs rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'assistant' ? 'bg-gray-50 text-gray-800' : 'bg-blue-600 text-white'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <Bot size={16} className="text-blue-500" />
            </div>
            <div className="bg-gray-50 rounded-2xl px-4 py-3 flex gap-1 items-center">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        {suggestions.map(s => (
          <button
            key={s}
            onClick={() => setInput(s)}
            className="text-xs border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors"
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
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
