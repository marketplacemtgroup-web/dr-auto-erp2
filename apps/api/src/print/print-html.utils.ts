import { formatBranchAddress } from '../common/format-branch-address';
import { OBSERVATION_ITEMS, WARRANTY_PARAGRAPHS } from './print-legal-content';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatMoney(value: unknown): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 'R$ 0,00';
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR');
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
}

export function osStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    RECEIVED: 'Recebido',
    DIAGNOSIS: 'Diagnostico',
    AWAITING_QUOTE: 'Aguardando orcamento',
    AWAITING_APPROVAL: 'Aguardando aprovacao',
    APPROVED: 'Aprovado',
    IN_PROGRESS: 'Em execucao',
    AWAITING_PART: 'Aguardando peca',
    PAUSED: 'Pausada',
    AWAITING_PAYMENT: 'Aguardando pagamento',
    FINISHED: 'Finalizado',
    DELIVERED: 'Entregue',
    CANCELLED: 'Cancelado',
  };
  return labels[status] ?? status;
}

export function quoteStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Pendente',
    APPROVED: 'Aprovado',
    REJECTED: 'Recusado',
    EXPIRED: 'Expirado',
    CANCELLED: 'Cancelado',
  };
  return labels[status] ?? status;
}

export function lineTypeLabel(lineType: string): string {
  if (lineType === 'PART') return 'Peca';
  if (lineType === 'SCANNER') return 'Scanner';
  if (lineType === 'THIRD_PARTY') return 'Terceirizado';
  return 'Servico';
}

export function checklistResultLabel(result: string | null | undefined): string {
  if (!result) return '';
  const labels: Record<string, string> = {
    OK: 'OK',
    ATTENTION: 'Atencao',
    DAMAGED: 'Danificado',
    NA: 'N/A',
  };
  return labels[result] ?? result;
}

export function checklistCategorySlug(label: string): string {
  return `checklist-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
}
  if (itemType === 'PART') return 'Peca';
  if (itemType === 'SCANNER') return 'Scanner';
  if (itemType === 'THIRD_PARTY') return 'Terceirizado';
  return 'Servico';
}

type CustomerAddress = {
  street?: string | null;
  addressNumber?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
};

export function formatCustomerAddress(customer: CustomerAddress): string {
  return formatBranchAddress(customer) ?? '—';
}

type OrgLike = {
  tradeName?: string | null;
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  footerText?: string | null;
  termsServiceOrder?: string | null;
  termsQuote?: string | null;
  branches?: Array<{
    isMain?: boolean;
    address?: string | null;
    street?: string | null;
    addressNumber?: string | null;
    complement?: string | null;
    district?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
  }>;
};

export function resolvePrintBranding(org: OrgLike) {
  const mainBranch = org.branches?.find((b) => b.isMain) ?? org.branches?.[0];
  const address =
    mainBranch?.address ??
    (mainBranch ? formatBranchAddress(mainBranch) : null) ??
    '—';

  return {
    name: org.tradeName || org.name,
    logoUrl: org.logoUrl ?? null,
    document: org.document ?? null,
    phone: org.phone ?? null,
    email: org.email ?? null,
    address,
    footerText: org.footerText ?? null,
  };
}

export const PRINT_STYLES = `
  @page { margin: 12mm; size: A4; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: #fff; color: #111; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.35; }
  .sheet { width: 100%; max-width: 210mm; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; border-bottom: 2px solid #0F3D4C; padding-bottom: 12px; margin-bottom: 16px; }
  .header-left { display: flex; gap: 12px; align-items: flex-end; min-width: 0; }
  .header-left img { height: 112px; width: auto; max-width: 240px; object-fit: contain; flex-shrink: 0; margin-top: -4px; }
  .header-left h1 { margin: 0; font-size: 18px; color: #0F3D4C; }
  .header-left p { margin: 2px 0 0; font-size: 10px; color: #555; }
  .header-right { text-align: right; flex-shrink: 0; font-weight: 700; }
  .header-right .doc-type { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748B; }
  .header-right .doc-number { font-size: 24px; color: #0F3D4C; margin: 0; }
  .header-right .doc-meta { font-size: 10px; color: #64748B; margin-top: 4px; }
  .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; font-weight: 700; }
  .card { border: 1px solid #E2E8F0; border-radius: 4px; padding: 10px; min-width: 0; }
  .card-title { font-size: 9px; text-transform: uppercase; color: #64748B; letter-spacing: 0.04em; margin: 0 0 6px; }
  .field { font-size: 9px; line-height: 1.25; margin: 2px 0; }
  .section-title { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #64748B; margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
  thead tr { background: #F8FAFC; border-top: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0; }
  th, td { padding: 6px 8px; }
  th { font-weight: 600; }
  tbody tr { border-bottom: 1px solid #F1F5F9; }
  tfoot tr { border-top: 2px solid #0F3D4C; font-weight: 700; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .muted { color: #64748B; }
  .total-value { color: #0F3D4C; font-weight: 700; }
  .photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
  .photo-card { break-inside: avoid; }
  .photo-label { font-size: 10px; font-weight: 700; color: #0F3D4C; margin: 0 0 4px; }
  .photo-result { color: #64748B; font-weight: 600; }
  .photo-notes { font-size: 10px; color: #444; margin: 4px 0 0; line-height: 1.35; white-space: pre-wrap; }
  .photos img { width: 100%; height: 120px; object-fit: cover; border: 1px solid #E2E8F0; border-radius: 4px; }
  footer { margin-top: 16px; padding-top: 12px; border-top: 1px solid #E2E8F0; }
  .legal h3 { font-size: 11px; font-weight: 700; color: #111; margin: 0 0 4px; }
  .legal p, .legal li { font-size: 10px; line-height: 1.3; color: #444; text-align: justify; }
  .legal ol { margin: 0; padding-left: 14px; columns: 2; column-gap: 16px; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 24px; break-inside: avoid; }
  .signature-line { border-top: 1px solid #333; padding-top: 4px; margin-top: 32px; font-size: 10px; }
  .whitespace-pre { white-space: pre-wrap; }
`;

export function printLegalTermsHtml(): string {
  const warrantyHtml = WARRANTY_PARAGRAPHS.map(
    (p) => `<p>${escapeHtml(p)}</p>`,
  ).join('');
  const observationsHtml = OBSERVATION_ITEMS.map(
    (item, idx) => `<li>${escapeHtml(item)}</li>`,
  ).join('');

  return `
    <section class="legal">
      <h3>TERMOS DE GARANTIA</h3>
      <div style="margin-bottom:8px;">${warrantyHtml}</div>
      <h3>OBSERVAÇÕES</h3>
      <ol>${observationsHtml}</ol>
    </section>
  `;
}

export function printField(label: string, value: string): string {
  return `<p class="field"><span>${escapeHtml(label)}: </span><span>${escapeHtml(value || '—')}</span></p>`;
}

export function wrapPrintDocument(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <div class="sheet">${body}</div>
</body>
</html>`;
}
