export const CAR_CHECKLIST_TEMPLATE: Array<{
  category: string;
  label: string;
}> = [
  { category: 'external', label: 'Foto frente' },
  { category: 'external', label: 'Foto traseira' },
  { category: 'external', label: 'Foto lado direito' },
  { category: 'external', label: 'Foto lado esquerdo' },
  { category: 'external', label: 'Chassis' },
  { category: 'internal', label: 'Painel' },
  { category: 'tires', label: 'Sulco pneu 1' },
  { category: 'tires', label: 'Sulco pneu 2' },
  { category: 'tires', label: 'Sulco pneu 3' },
  { category: 'tires', label: 'Sulco pneu 4' },
  { category: 'internal', label: 'Quantidade de combustível' },
  { category: 'internal', label: 'KM' },
];

/** Itens preenchidos por texto (notes) em vez de resultado OK/Atenção. */
export const CHECKLIST_TEXT_ONLY_LABELS = new Set([
  'Quantidade de combustível',
  'KM',
]);

const TEMPLATE_LABELS = CAR_CHECKLIST_TEMPLATE.map((item) => item.label);

/** OS antigas podem ter checklist legado (22 itens); detecta divergência do template atual. */
export function checklistMatchesTemplate(currentLabels: string[]): boolean {
  if (currentLabels.length !== TEMPLATE_LABELS.length) return false;
  return TEMPLATE_LABELS.every((label, idx) => currentLabels[idx] === label);
}
