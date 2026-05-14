/**
 * Politica de senha do CRM. Espelha PasswordPolicy.java do backend para
 * dar feedback imediato sem precisar bater no servidor. Backend continua
 * sendo a fonte de verdade - se essa lista divergir, o admin nao consegue
 * salvar e ve a mensagem do backend.
 */

export type PasswordRule = {
  label: string
  test: (pw: string) => boolean
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: 'Mais de 8 caracteres',           test: pw => pw.length > 8 },
  { label: 'Pelo menos 1 letra maiúscula',   test: pw => /[A-Z]/.test(pw) },
  { label: 'Pelo menos 1 letra minúscula',   test: pw => /[a-z]/.test(pw) },
  { label: 'Pelo menos 1 número',            test: pw => /\d/.test(pw) },
  { label: 'Pelo menos 1 caractere especial', test: pw => /[^A-Za-z0-9]/.test(pw) },
]

/** Retorna null se a senha passa em todas as regras, ou a 1ª mensagem que falhar. */
export function validatePassword(pw: string): string | null {
  for (const r of PASSWORD_RULES) {
    if (!r.test(pw)) return r.label
  }
  return null
}
