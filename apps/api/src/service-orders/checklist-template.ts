export const CAR_CHECKLIST_TEMPLATE: Array<{
  category: string;
  label: string;
}> = [
  { category: 'external', label: 'Foto dianteira' },
  { category: 'external', label: 'Foto traseira' },
  { category: 'external', label: 'Foto lateral direita' },
  { category: 'external', label: 'Foto lateral esquerda' },
  { category: 'internal', label: 'Painel' },
  { category: 'internal', label: 'Teto' },
];

/** Itens preenchidos por texto (notes) em vez de resultado OK/Atenção. */
export const CHECKLIST_TEXT_ONLY_LABELS = new Set<string>();

const TEMPLATE_LABELS = CAR_CHECKLIST_TEMPLATE.map((item) => item.label);

/** OS antigas podem ter checklist legado (22 itens); detecta divergência do template atual. */
export function checklistMatchesTemplate(currentLabels: string[]): boolean {
  if (currentLabels.length !== TEMPLATE_LABELS.length) return false;
  return TEMPLATE_LABELS.every((label, idx) => currentLabels[idx] === label);
}
