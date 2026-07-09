import { CommissionRuleType, GeneratedCommissionStatus, ServiceOrderStatus } from '@prisma/client';

export const OS_IN_PROGRESS: ServiceOrderStatus[] = [
  'IN_PROGRESS',
  'APPROVED',
  'AWAITING_PART',
  'RECEIVED',
];

export const OS_FINISHED: ServiceOrderStatus[] = ['FINISHED', 'DELIVERED'];

export function resolveServiceExecutors(
  item: {
    executorId: string | null;
    coExecutorId?: string | null;
    coExecutorSplitPct?: number | null;
  },
  so: { executionById: string | null },
) {
  const primaryId = item.executorId ?? so.executionById;
  if (!primaryId) return [] as Array<{ employeeId: string; sharePct: number }>;

  const coId = item.coExecutorId ?? null;
  if (!coId || coId === primaryId) {
    return [{ employeeId: primaryId, sharePct: 100 }];
  }

  const splitPct = Math.min(100, Math.max(0, item.coExecutorSplitPct ?? 50));
  const primaryShare = 100 - splitPct;
  const shares: Array<{ employeeId: string; sharePct: number }> = [];
  if (primaryShare > 0) shares.push({ employeeId: primaryId, sharePct: primaryShare });
  if (splitPct > 0) shares.push({ employeeId: coId, sharePct: splitPct });
  return shares;
}

export function itemBelongsToEmployee(
  item: {
    itemType: string;
    executorId: string | null;
    coExecutorId?: string | null;
    coExecutorSplitPct?: number | null;
    soldById?: string | null;
  },
  so: { executionById: string | null },
  employeeId: string,
): boolean {
  if (item.itemType === 'PART') return item.soldById === employeeId;
  if (item.itemType === 'SERVICE') {
    return resolveServiceExecutors(item, so).some((s) => s.employeeId === employeeId);
  }
  return false;
}

export function employeeShareOfExpectedCommission(
  item: {
    expectedCommission?: unknown;
    executorId: string | null;
    coExecutorId?: string | null;
    coExecutorSplitPct?: number | null;
  },
  so: { executionById: string | null },
  employeeId: string,
): number {
  if (item.expectedCommission == null) return 0;
  const shares = resolveServiceExecutors(item, so);
  const mine = shares.find((s) => s.employeeId === employeeId);
  if (!mine) return 0;
  const totalSharePct = shares.reduce((s, x) => s + x.sharePct, 0);
  if (totalSharePct <= 0) return 0;
  return (
    Math.round(
      (Number(item.expectedCommission) * (mine.sharePct / totalSharePct)) * 100,
    ) / 100
  );
}

export function employeeParticipationWhere(employeeId: string) {
  return {
    OR: [
      { executionById: employeeId },
      { coExecutionById: employeeId },
      { generalResponsibleId: employeeId },
      { finalizedById: employeeId },
      { checklistById: employeeId },
      { diagnosisById: employeeId },
      {
        items: {
          some: {
            OR: [
              { executorId: employeeId },
              { coExecutorId: employeeId },
              { soldById: employeeId },
            ],
          },
        },
      },
    ],
  };
}

export function mapOsStatusToApp(status: ServiceOrderStatus): string {
  switch (status) {
    case 'IN_PROGRESS':
    case 'APPROVED':
    case 'AWAITING_PART':
    case 'PAUSED':
      return 'em_execucao';
    case 'FINISHED':
    case 'DELIVERED':
      return 'finalizada';
    case 'RECEIVED':
    case 'DIAGNOSIS':
    case 'AWAITING_QUOTE':
    case 'AWAITING_APPROVAL':
    case 'AWAITING_PAYMENT':
      return 'aguardando_aprovacao';
    case 'CANCELLED':
      return 'cancelada';
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
