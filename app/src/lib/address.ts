export type AddressParts = {
  street?: string | null;
  addressNumber?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  address?: string | null;
};

export function formatAddressLine(parts: AddressParts): string {
  const streetLine = [parts.street?.trim(), parts.addressNumber?.trim()]
    .filter(Boolean)
    .join(", ");
  const cityChunk =
    parts.city?.trim() && parts.state?.trim()
      ? `${parts.city.trim()}/${parts.state.trim()}`
      : parts.city?.trim() || parts.state?.trim() || "";
  const locationLine = [
    parts.district?.trim(),
    cityChunk,
    parts.zipCode?.trim() ? `CEP ${parts.zipCode.trim()}` : null,
  ]
    .filter(Boolean)
    .join(" - ");
  return [streetLine, parts.complement?.trim(), locationLine].filter(Boolean).join(" - ");
}

export function resolveAddressDisplay(parts: AddressParts): string {
  return parts.address?.trim() || formatAddressLine(parts);
}
