export type CepAddress = {
  street: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
};

export function normalizeCep(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
}

export function formatCepInput(value: string): string {
  const digits = normalizeCep(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export async function fetchAddressByCep(cep: string): Promise<CepAddress | null> {
  const digits = normalizeCep(cep);
  if (digits.length !== 8) return null;

  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!res.ok) throw new Error("Erro ao consultar CEP");

  const data = (await res.json()) as {
    erro?: boolean;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
    cep?: string;
  };

  if (data.erro) return null;

  return {
    street: data.logradouro ?? "",
    district: data.bairro ?? "",
    city: data.localidade ?? "",
    state: data.uf ?? "",
    zipCode: formatCepInput(data.cep ?? digits),
  };
}
