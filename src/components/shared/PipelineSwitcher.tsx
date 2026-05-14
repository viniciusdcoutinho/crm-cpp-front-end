import { GitBranch } from 'lucide-react'
import { useCurrentPipeline } from '../../lib/pipelines'

/**
 * Switcher de pipeline. Renderiza:
 *  - nada se o user tem 0 ou 1 pipeline (kanban abre direto no unico);
 *  - dropdown se tem 2+, com lembranca via localStorage.
 *
 * O componente nao precisa de props - le e altera o pipeline atual via
 * useCurrentPipeline().
 */
export function PipelineSwitcher() {
  const { pipelines, current, select, hasMultiple } = useCurrentPipeline()

  if (!hasMultiple) return null

  return (
    <div className="flex items-center gap-2">
      <GitBranch size={14} className="text-gray-400" />
      <select
        value={current?.id ?? ''}
        onChange={e => select(e.target.value || null)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
      >
        {pipelines.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  )
}
