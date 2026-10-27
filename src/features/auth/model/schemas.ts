import { z } from 'zod'

export const emailSchema = z.string().trim().min(1, 'Informe o e-mail').email('Informe um e-mail válido')

/** Mesma política do servidor: 8+ caracteres, letras, números e símbolo. */
export const newPasswordSchema = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .regex(/[A-Za-z]/, 'Use letras e números')
  .regex(/\d/, 'Use letras e números')
  .regex(/[^A-Za-z0-9]/, 'Inclua ao menos um símbolo')

export const usernameSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9_.]{3,20}$/i, 'Use 3–20 letras, números, "_" ou "."')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe a senha'),
})

export const signupSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirme a senha'),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não coincidem' })

/** Só aceita destinos internos (evita open redirect). */
export function safeRedirect(target: string | undefined) {
  return target && target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/login') && !target.startsWith('/signup')
    ? target
    : '/'
}

export const authSearchSchema = z.object({
  redirect: z.string().max(500).optional().catch(undefined),
  reason: z.enum(['expired']).optional().catch(undefined),
})
