import { useCallback, useRef, useState } from "react";
import { fetchAddressByCep, formatCepInput, normalizeCep } from "../../lib/cep";
import { FormField, inputClass } from "../modules/FormDrawer";

export type OrganizationAddressForm = {
  zipCode: string;
  street: string;
  addressNumber: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};

export const emptyOrganizationAddress = (): OrganizationAddressForm => ({
  zipCode: "",
  street: "",
  addressNumber: "",
  complement: "",
  district: "",
  city: "",
  state: "",
});

type Props = {
  form: OrganizationAddressForm;
  onChange: (patch: Partial<OrganizationAddressForm>) => void;
};

export default function OrganizationAddressFields({ form, onChange }: Props) {
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

        onChange({
          zipCode: address.zipCode,
          street: address.street || form.street,
          district: address.district || form.district,
          city: address.city || form.city,
          state: address.state || form.state,
        });
        numberInputRef.current?.focus();
      } catch {
        setCepError("Não foi possível consultar o CEP");
        lastLookupRef.current = "";
      } finally {
        setCepLoading(false);
      }
    },
    [onChange],
  );

  return (
    <>
      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide pt-1">
        Endereço da oficina
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
              onChange({ zipCode: formatted });
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
            onChange={(e) => onChange({ city: e.target.value })}
          />
        </FormField>
      </div>
      <FormField label="Rua / logradouro">
        <input
          className={inputClass}
          value={form.street}
          onChange={(e) => onChange({ street: e.target.value })}
        />
      </FormField>
      <div className="grid grid-cols-3 gap-3">
        <FormField label="Número *">
          <input
            ref={numberInputRef}
            className={inputClass}
            value={form.addressNumber}
            onChange={(e) => onChange({ addressNumber: e.target.value })}
            placeholder="Ex.: 490"
          />
        </FormField>
        <FormField label="Bairro" className="col-span-2">
          <input
            className={inputClass}
            value={form.district}
            onChange={(e) => onChange({ district: e.target.value })}
          />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Complemento">
          <input
            className={inputClass}
            value={form.complement}
            onChange={(e) => onChange({ complement: e.target.value })}
          />
        </FormField>
        <FormField label="UF">
          <input
            className={inputClass}
            value={form.state}
            maxLength={2}
            onChange={(e) => onChange({ state: e.target.value.toUpperCase() })}
          />
        </FormField>
      </div>
    </>
  );
}
