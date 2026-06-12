import { useCallback, useRef, useState } from "react";
import { fetchAddressByCep, formatCepInput, normalizeCep } from "../../lib/cep";
import { FormField, inputClass, selectClass } from "../modules/FormDrawer";

export type CustomerFormState = {
  name: string;
  customerType: "PF" | "PJ";
  document: string;
  phone: string;
  whatsapp: string;
  email: string;
  street: string;
  addressNumber: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
  origin: string;
  isVip: boolean;
  isBlocked: boolean;
  isDelinquent: boolean;
  notes: string;
};

export const emptyCustomerForm = (): CustomerFormState => ({
  name: "",
  customerType: "PF",
  document: "",
  phone: "",
  whatsapp: "",
  email: "",
  street: "",
  addressNumber: "",
  complement: "",
  district: "",
  city: "",
  state: "",
  zipCode: "",
  origin: "",
  isVip: false,
  isBlocked: false,
  isDelinquent: false,
  notes: "",
});

export function customerFormPayload(form: CustomerFormState) {
  return {
    name: form.name,
    customerType: form.customerType,
    document: form.document || undefined,
    phone: form.phone || undefined,
    whatsapp: form.whatsapp || undefined,
    email: form.email || undefined,
    street: form.street || undefined,
    addressNumber: form.addressNumber || undefined,
    complement: form.complement || undefined,
    district: form.district || undefined,
    city: form.city || undefined,
    state: form.state || undefined,
    zipCode: form.zipCode || undefined,
    origin: form.origin || undefined,
    isVip: form.isVip,
    isBlocked: form.isBlocked,
    isDelinquent: form.isDelinquent,
    notes: form.notes || undefined,
  };
}

type Props = {
  form: CustomerFormState;
  setForm: React.Dispatch<React.SetStateAction<CustomerFormState>>;
};

export default function CustomerFormFields({ form, setForm }: Props) {
  const lastLookupRef = useRef("");
  const numberInputRef = useRef<HTMLInputElement>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  const lookupCep = useCallback(
    async (rawCep: string) => {
      const digits = normalizeCep(rawCep);
      if (digits.length !== 8 || digits === lastLookupRef.current) return;

      lastLookupRef.current = digits;
      setCepLoading(true);
      setCepError(null);

      try {
        const address = await fetchAddressByCep(digits);
        if (!address) {
          setCepError("CEP não encontrado");
          lastLookupRef.current = "";
          return;
        }

        setForm((f) => ({
          ...f,
          zipCode: address.zipCode,
          street: address.street || f.street,
          district: address.district || f.district,
          city: address.city || f.city,
          state: address.state || f.state,
        }));
        numberInputRef.current?.focus();
      } catch {
        setCepError("Não foi possível consultar o CEP");
        lastLookupRef.current = "";
      } finally {
        setCepLoading(false);
      }
    },
    [setForm],
  );

  return (
    <>
      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide pt-1">
        Identificação
      </p>
      <FormField label="Nome completo *">
        <input
          className={inputClass}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Tipo">
          <select
            className={selectClass}
            value={form.customerType}
            onChange={(e) =>
              setForm((f) => ({ ...f, customerType: e.target.value as "PF" | "PJ" }))
            }
          >
            <option value="PF">Pessoa física</option>
            <option value="PJ">Pessoa jurídica</option>
          </select>
        </FormField>
        <FormField label="CPF / CNPJ">
          <input
            className={inputClass}
            value={form.document}
            onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))}
            placeholder="Portal do cliente usa o CPF"
          />
        </FormField>
      </div>

      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide pt-1">
        Contato
      </p>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Telefone">
          <input
            className={inputClass}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </FormField>
        <FormField label="WhatsApp">
          <input
            className={inputClass}
            value={form.whatsapp}
            onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
          />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="E-mail">
          <input
            type="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </FormField>
        <FormField label="Como conheceu (origem)">
          <input
            className={inputClass}
            value={form.origin}
            onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))}
            placeholder="Indicação, Google..."
          />
        </FormField>
      </div>

      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide pt-1">
        Endereço
      </p>
      <div className="grid grid-cols-3 gap-3">
        <FormField label="CEP" className="col-span-1">
          <input
            className={inputClass}
            value={form.zipCode}
            placeholder="00000-000"
            maxLength={9}
            inputMode="numeric"
            onChange={(e) => {
              const formatted = formatCepInput(e.target.value);
              setForm((f) => ({ ...f, zipCode: formatted }));
              const digits = normalizeCep(formatted);
              if (digits.length !== 8) {
                lastLookupRef.current = "";
                setCepError(null);
                return;
              }
              void lookupCep(formatted);
            }}
            onBlur={() => void lookupCep(form.zipCode)}
          />
          {cepLoading && (
            <p className="text-[11px] text-[#64748B] mt-1">Buscando endereço...</p>
          )}
          {cepError && !cepLoading && (
            <p className="text-[11px] text-[#DC2626] mt-1">{cepError}</p>
          )}
        </FormField>
        <FormField label="Cidade" className="col-span-2">
          <input
            className={inputClass}
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
        </FormField>
      </div>
      <FormField label="Rua / logradouro">
        <input
          className={inputClass}
          value={form.street}
          onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
        />
      </FormField>
      <div className="grid grid-cols-3 gap-3">
        <FormField label="Número">
          <input
            ref={numberInputRef}
            className={inputClass}
            value={form.addressNumber}
            onChange={(e) => setForm((f) => ({ ...f, addressNumber: e.target.value }))}
          />
        </FormField>
        <FormField label="Bairro" className="col-span-2">
          <input
            className={inputClass}
            value={form.district}
            onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
          />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Complemento">
          <input
            className={inputClass}
            value={form.complement}
            onChange={(e) => setForm((f) => ({ ...f, complement: e.target.value }))}
          />
        </FormField>
        <FormField label="UF">
          <input
            className={inputClass}
            value={form.state}
            maxLength={2}
            onChange={(e) =>
              setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))
            }
          />
        </FormField>
      </div>

      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide pt-1">
        Classificação
      </p>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isVip}
            onChange={(e) => setForm((f) => ({ ...f, isVip: e.target.checked }))}
          />
          Cliente VIP
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isDelinquent}
            onChange={(e) => setForm((f) => ({ ...f, isDelinquent: e.target.checked }))}
          />
          Inadimplente
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isBlocked}
            onChange={(e) => setForm((f) => ({ ...f, isBlocked: e.target.checked }))}
          />
          Bloqueado
        </label>
      </div>

      <FormField label="Observações internas">
        <textarea
          className={`${inputClass} min-h-[52px] py-1.5`}
          rows={2}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </FormField>
    </>
  );
}
