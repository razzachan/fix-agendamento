import { z } from 'zod';

export const AllowedIntents = [
  'saudacao_inicial',
  'orcamento_equipamento',
  'agendamento_servico',
  'status_ordem',
  'reagendamento',
  'cancelamento',
  'pos_atendimento',
  'instalacao',
  'multi_equipamento',
  'outros',
] as const;

export type AIRouterIntent = (typeof AllowedIntents)[number];

export const AllowedActions = [
  'coletar_dados',
  'gerar_orcamento',
  'agendar_servico',
  'responder_informacao',
  'transferir_humano',
] as const;

export type AIRouterAction = (typeof AllowedActions)[number];

export const AllowedMounts = ['embutido', 'bancada', 'industrial', 'piso', 'cooktop'] as const;

export type AIRouterMount = (typeof AllowedMounts)[number];

const IntentSchema = z.enum(AllowedIntents);
const AcaoSchema = z.enum(AllowedActions);
const MountSchema = z.enum(AllowedMounts);

const DadosExtrairSchema = z
  .object({
    equipamento: z.string().min(1).optional(),
    marca: z.string().min(1).optional(),
    problema: z.string().min(1).optional(),
    mount: MountSchema.optional(),
    power_type: z.string().min(1).optional(),
    num_burners: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => (v == null ? undefined : String(v))),
  })
  .passthrough();

export const AIRouterDecisionSchema = z
  .object({
    intent: IntentSchema,
    blocos_relevantes: z
      .array(z.number().int().positive())
      .max(3)
      .optional()
      .default([]),
    dados_extrair: DadosExtrairSchema.optional().default({}),
    acao_principal: AcaoSchema,
    resposta_sugerida: z.string().optional().default(''),
  })
  .passthrough();

export type AIRouterDecision = z.infer<typeof AIRouterDecisionSchema>;

export function parseAIRoutingDecision(input: unknown): AIRouterDecision {
  const parsed = AIRouterDecisionSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; ');
    throw new Error(`AI router JSON inválido (schema): ${issues}`);
  }
  return parsed.data;
}
