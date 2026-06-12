import { FormField, inputClass } from "../modules/FormDrawer";

type Props = {
  label: string;
  username: string;
  domain: string;
  onUsernameChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
};

export default function LoginUsernameField({
  label,
  username,
  domain,
  onUsernameChange,
  placeholder = "joao.silva",
  required,
}: Props) {
  const suffix = domain ? `@${domain}` : "@…";

  return (
    <FormField label={label}>
      <div className="flex items-stretch rounded-lg border border-[#E2E8F0] overflow-hidden focus-within:border-[#0E7490]">
        <input
          className={`${inputClass} border-0 rounded-none focus:ring-0 flex-1 min-w-0`}
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="username"
          required={required}
        />
        <span className="inline-flex items-center px-3 bg-[#F8FAFC] text-sm text-[#64748B] border-l border-[#E2E8F0] whitespace-nowrap">
          {suffix}
        </span>
      </div>
      {domain && username.trim() && (
        <p className="text-xs text-[#94A3B8] mt-1">
          Login completo:{" "}
          <span className="font-medium text-[#475569]">
            {username.trim().toLowerCase().replace(/\s+/g, ".")}
            @{domain}
          </span>
        </p>
      )}
    </FormField>
  );
}
