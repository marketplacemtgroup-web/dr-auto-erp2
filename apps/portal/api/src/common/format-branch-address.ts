export type BranchAddressFields = {
  street?: string | null;
  addressNumber?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
};

export function formatBranchAddress(fields: BranchAddressFields): string | null {
  const streetLine = [fields.street, fields.addressNumber].filter(Boolean).join(', ');
  const parts: string[] = [];

  if (streetLine) parts.push(streetLine);
  if (fields.complement) parts.push(fields.complement);

  const location = [
    fields.district,
    fields.city && fields.state ? `${fields.city}/${fields.state}` : fields.city || fields.state,
  ]
    .filter(Boolean)
    .join(' - ');

  if (location) parts.push(location);
  if (fields.zipCode) parts.push(`CEP ${fields.zipCode}`);

  return parts.length ? parts.join(' - ') : null;
}
