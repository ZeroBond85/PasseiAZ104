import { z } from 'zod'

// Códigos TRAVADOS §3 (nunca [a-z]{2} genérico)
export const CODE_BY_DOMAIN = {
  'identidade-governanca': 'ig',
  storage: 'st',
  compute: 'co',
  'rede-virtual': 'rv',
  monitoramento: 'mo',
} as const

export type Domain = keyof typeof CODE_BY_DOMAIN

export const QuestionSchema = z.object({
  id: z.string().regex(/^az104-(ig|st|co|rv|mo)-\d{3}$/),
  domain: z.enum([
    'identidade-governanca',
    'storage',
    'compute',
    'rede-virtual',
    'monitoramento',
  ]),
  subdomain: z.string().min(1),
  type: z.enum(['single', 'multiple', 'case-study', 'yes-no']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  question: z.string().min(50),
  options: z
    .array(
      z.object({
        letter: z.string().regex(/^[A-F]$/),
        text: z.string().min(1),
      }),
    )
    .min(2)
    .max(6),
  correct: z.array(z.string().regex(/^[A-F]$/)).min(1),
  explanation: z.string().min(100),
  source: z.enum(['original', 'mslearn', 'community', 'ai-generated']),
  sourceUrl: z.string().url().optional(),
  generatedWith: z
    .object({ model: z.string(), date: z.string().datetime() })
    .optional(),
  needsReview: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  caseStudyId: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().default(1),
})

export type Question = z.infer<typeof QuestionSchema>

const schemaWithRefinements = QuestionSchema.superRefine((q, ctx) => {
  if ((q.source === 'community' || q.source === 'mslearn') && !q.sourceUrl) {
    ctx.addIssue({
      code: 'custom',
      message: 'sourceUrl obrigatório para community/mslearn',
    })
  }
  if (q.type === 'case-study' && !q.caseStudyId) {
    ctx.addIssue({
      code: 'custom',
      message: 'caseStudyId obrigatório para case-study',
    })
  }
  if (q.type !== 'case-study' && q.caseStudyId) {
    ctx.addIssue({
      code: 'custom',
      message: 'caseStudyId só permitido para case-study',
    })
  }
  if (CODE_BY_DOMAIN[q.domain] !== q.id.split('-')[1]) {
    ctx.addIssue({
      code: 'custom',
      message: `id ${q.id} incompatível com domain ${q.domain}`,
    })
  }
  const letters = q.options.map((o) => o.letter)
  if (new Set(letters).size !== letters.length) {
    ctx.addIssue({ code: 'custom', message: 'options.letter duplicada' })
  }
  const letterSet = new Set(letters)
  for (const c of q.correct) {
    if (!letterSet.has(c))
      ctx.addIssue({ code: 'custom', message: `correct ${c} fora de options` })
  }
  if (q.type === 'single' && q.correct.length !== 1) {
    ctx.addIssue({
      code: 'custom',
      message: 'single exige exatamente 1 correct',
    })
  }
  if (q.type === 'multiple' && q.correct.length < 2) {
    ctx.addIssue({ code: 'custom', message: 'multiple exige >=2 correct' })
  }
  if (
    q.type === 'yes-no' &&
    (q.options.length !== 2 || q.correct.length !== 1)
  ) {
    ctx.addIssue({
      code: 'custom',
      message: 'yes-no exige 2 options + 1 correct',
    })
  }
  if (
    (q.type === 'single' || q.type === 'multiple' || q.type === 'case-study') &&
    q.options.length < 4
  ) {
    ctx.addIssue({
      code: 'custom',
      message: 'single/multiple/case-study exigem >=4 options',
    })
  }
})

export function validateQuestion(q: unknown) {
  return schemaWithRefinements.safeParse(q)
}

export const SimuladoSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('seed'),
    id: z.string(),
    title: z.string().min(1),
    seed: z.number().int().nonnegative(),
    questionCount: z.number().int().min(1).max(100).default(50),
    timeLimitMinutes: z.number().int().min(10).max(300).default(100),
  }),
  z.object({
    mode: z.literal('fixed'),
    id: z.string(),
    title: z.string().min(1),
    questionIds: z
      .string()
      .array()
      .length(50)
      .refine((a) => new Set(a).size === 50, {
        message: 'questionIds duplicado',
      }),
    timeLimitMinutes: z.literal(100),
  }),
])

export type SimuladoSpec = z.infer<typeof SimuladoSchema>
