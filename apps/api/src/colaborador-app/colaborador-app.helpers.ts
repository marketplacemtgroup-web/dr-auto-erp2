import { CommissionRuleType, GeneratedCommissionStatus, ServiceOrderStatus } from '@prisma/client';

export const OS_IN_PROGRESS: ServiceOrderStatus[] = [
  'IN_PROGRESS',
  'APPROVED',
  'AWAITING_PART',
  'RECEIVED',
];

export const OS_FINISHED: ServiceOrderStatus[] = ['FINISHED', 'DELIVERED'];

export function employeeParticipationWhere(employeeId: string) {
  return {
    OR: [
      { executionById: employeeId },
      { generalResponsibleId: employeeId },
      { finalizedById: employeeId },
      { checklistById: employeeId },
      { diagnosisById: employeeId },
      { items: { some: { OR: [{ executorId: employeeId }, { soldById: employeeId }] } } },
    ],
  };
}

export function mapOsStatusToApp(status: ServiceOrderStatus): string {
  switch (status) {
    case 'IN_PROGRESS':
    case 'APPROVED':
    case 'AWAITING_PART':
      return 'em_execucao';
    case 'FINISHED':
    case 'DELIVERED':
      return 'finalizada';
    case 'RECEIVED':
      return 'aguardando_aprovacao';
    case 'CANCELLED':
      return 'cancelada';
    default:
      return status.toLowerCase();
  }
}

export function mapCommissionStatusToApp(status: GeneratedCommissionStatus | 'PREVISTA'): string {
  switch (status) {
    case 'PENDENTE':
      return 'pendente';
    case 'APROVADA':
      return 'aprovada';
    case 'PAGA':
      return 'paga';
    case 'CANCELADA':
      return 'cancelada';
    case 'ESTORNADA':
      return 'estornada';
    case 'PREVISTA':
      return 'prevista';
    default:
      return String(status).toLowerCase();
  }
}

const BASE_LABELS: Record<string, string> = {
  MAO_DE_OBRA: 'mão de obra',
  VALOR_PECAS: 'venda de peças',
  VALOR_SERVICO: 'valor do serviço',
  VALOR_OS: 'valor total da OS',
  VALOR_LIQUIDO: 'valor líquido',
};

const RULE_TYPE_LABELS: Record<string, string> = {
  MAO_DE_OBRA: 'mão de obra',
  PECAS: 'peças',
  SERVICO_ESPECIFICO: 'serviço específico',
  PRODUTO_ESPECIFICO: 'produto específico',
  TOTAL_OS: 'total da OS',
  OS_FINALIZADA: 'OS finalizada',
  VALOR_FIXO: 'valor fixo',
  PERCENTUAL: 'percentual',
  MANUAL: 'manual',
  META: 'meta',
};

export function describeCommissionRule(rule: {
  ruleType: CommissionRuleType;
  baseCalculation: string;
  percentage?: unknown;
  fixedAmount?: unknown;
}): string {
  const pct = rule.percentage != null ? Number(rule.percentage) : null;
  const fixed = rule.fixedAmount != null ? Number(rule.fixedAmount) : null;
  const base = BASE_LABELS[rule.baseCalculation] ?? rule.baseCalculation.toLowerCase();
  const type = RULE_TYPE_LABELS[rule.ruleType] ?? rule.ruleType;

  if (pct != null && pct > 0) {
    return `${pct}% sobre ${base} (${type})`;
  }
  if (fixed != null && fixed > 0) {
    return `R$ ${fixed.toFixed(2)} fixo (${type})`;
  }
  return `Regra: ${type} — base ${base}`;
}

export function monthRangeUtc(ref = new Date()) {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  return { start, end, startStr: start.toISOString().slice(0, 10), endStr: end.toISOString().slice(0, 10) };
}

export function todayRangeUtc(ref = new Date()) {
  const startStr = ref.toISOString().slice(0, 10);
  const start = new Date(`${startStr}T00:00:00.000Z`);
  const end = new Date(`${startStr}T23:59:59.999Z`);
  return { start, end, startStr };
}
