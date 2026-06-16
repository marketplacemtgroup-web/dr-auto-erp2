export type CustomerAddressFields = {
  street?: string | null;
  addressNumber?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
};

export function formatCustomerAddress(customer: CustomerAddressFields): string {
  const streetLine = [customer.street, customer.addressNumber, customer.complement]
    .filter(Boolean)
    .join(", ");
  const cityLine = [customer.district, customer.city, customer.state]
    .filter(Boolean)
    .join(" - ");
  const parts = [streetLine, cityLine, customer.zipCode ? `CEP ${customer.zipCode}` : ""].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(" · ") : "";
}
