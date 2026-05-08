// Substitui placeholders [nome] [email] [telefone] no conteudo de um script
// pelos dados do usuario logado. Usado tanto na exibicao quanto na copia.
type UserVars = {
  name?: string | null
  email?: string | null
  telefone?: string | null
}

export const SCRIPT_TOKENS = ['[nome]', '[email]', '[telefone]'] as const

export function substituteScriptVars(content: string, user?: UserVars | null): string {
  if (!content) return content
  const safe = (v?: string | null) => v ?? ''
  return content
    .replace(/\[nome\]/gi,     safe(user?.name))
    .replace(/\[email\]/gi,    safe(user?.email))
    .replace(/\[telefone\]/gi, safe(user?.telefone))
}
