import { PortalSubpageHeader } from "../../components/portal/PortalAppLayout";
import { routes } from "../../lib/routes";
import { usePortalStore } from "../../stores/portalStore";

export default function PortalProfileDataPage() {
  const dashboard = usePortalStore((s) => s.dashboard);
  const session = usePortalStore((s) => s.session);

  const rows = [
    { label: "Nome", value: dashboard?.customer.name ?? session?.customerName ?? "—" },
    { label: "Telefone", value: dashboard?.customer.phone ?? "—" },
    { label: "WhatsApp", value: dashboard?.customer.whatsapp ?? "—" },
    { label: "Placa atual", value: session?.plate ?? dashboard?.vehicle.plate ?? "—" },
    { label: "Veículo", value: [dashboard?.vehicle.brand, dashboard?.vehicle.model].filter(Boolean).join(" ") || "—" },
  ];

  return (
    <div className="space-y-4">
      <PortalSubpageHeader title="Meus Dados" backTo={routes.profile} />
      <article className="portal-card divide-y" style={{ borderColor: "var(--portal-border)" }}>
        {rows.map((row) => (
          <div key={row.label} className="px-4 py-3">
            <p className="portal-text-muted text-xs">{row.label}</p>
            <p className="portal-text font-semibold text-sm mt-0.5">{row.value}</p>
          </div>
        ))}
      </article>
      <p className="portal-text-muted text-xs text-center px-4">
        Para alterar seus dados cadastrais, entre em contato com a oficina.
      </p>
    </div>
  );
}
