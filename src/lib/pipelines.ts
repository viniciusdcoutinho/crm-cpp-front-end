import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { pipelinesApi, usersApi } from './api'

const LS_KEY = 'crm-current-pipeline'

export type PipelineLite = { id: string; name: string; slug: string; color: string }

export function useMyPipelines() {
  return useQuery<PipelineLite[]>({
    queryKey: ['my-pipelines'],
    queryFn:  pipelinesApi.mine,
    staleTime: 60_000,
  })
}

export function useMe() {
  return useQuery<{
    id: string; name: string; email: string; role: string;
    defaultPipelineId: string | null;
    pipelines: PipelineLite[];
  }>({
    queryKey: ['me'],
    queryFn:  usersApi.me,
    staleTime: 60_000,
  })
}

/**
 * Pipeline atualmente selecionado no kanban/performance + setter pra
 * trocar. Persiste a escolha em localStorage. Default:
 *  1) ultimo escolhido (localStorage), se ainda visivel pro user;
 *  2) pipeline preferencial do user (defaultPipelineId);
 *  3) primeiro pipeline da lista;
 *  4) null (user sem acesso a nenhum pipeline).
 */
export function useCurrentPipeline() {
  const { data: pipelines = [] } = useMyPipelines()
  const { data: me }             = useMe()
  const [stored, setStored] = useState<string | null>(() => localStorage.getItem(LS_KEY))

  let currentId: string | null = stored ?? me?.defaultPipelineId ?? pipelines[0]?.id ?? null
  if (currentId && pipelines.length > 0 && !pipelines.some(p => p.id === currentId)) {
    currentId = me?.defaultPipelineId ?? pipelines[0]?.id ?? null
  }
  const current = pipelines.find(p => p.id === currentId) ?? null

  const select = (id: string | null) => {
    if (id) localStorage.setItem(LS_KEY, id)
    else    localStorage.removeItem(LS_KEY)
    setStored(id)
  }

  return { pipelines, current, select, hasMultiple: pipelines.length > 1 }
}
