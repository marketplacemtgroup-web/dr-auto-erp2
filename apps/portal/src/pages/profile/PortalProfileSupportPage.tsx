import { MessageCircle, MapPin, Phone, Clock } from "lucide-react";
import { PortalSubpageHeader } from "../../components/portal/PortalAppLayout";
import { routes } from "../../lib/routes";
import { whatsappUrl } from "../../lib/whatsapp";
import { usePortalStore } from "../../stores/portalStore";

export default function PortalProfileSupportPage() {
  const dashboard = usePortalStore((s) => s.dashboard);
  const session = usePortalStore((s) => s.session);

  const orgName = dashboard?.organization.name ?? session?.organizationName ?? "Oficina";
  const phone = dashboard?.organization.phone ?? dashboard?.customer.phone ?? "";
  const whatsapp = dashboard?.customer.whatsapp ?? phone;
  const address = dashboard?.organization.address ?? "Endereço não informado";

  return (
    <div className="space-y-4">
      <PortalSubpageHeader title="Suporte" backTo={routes.profile} />

      <div className="text-center py-4">
        <div
          className="mx-auto h-20 w-20 rounded-full flex items-center justify-center mb-4"
          style={{ background: "color-mix(in srgb, var(--portal-primary) 20%, transparent)" }}
        >
          <Phone size={40} style={{ color: "var(--portal-accent)" }} />
        </div>
        <h2 className="portal-text text-xl font-black">Fale com a {orgName}</h2>
        <p className="portal-text-muted text-sm mt-2 max-w-sm mx-auto">
          Precisa de ajuda ou tirou alguma dúvida? Fale diretamente com o consultor responsável
          pelo seu veículo.
        </p>
      </div>

      <article className="portal-card p-4 space-y-3">
        <p className="portal-accent text-xs font-bold uppercase">Canais de Atendimento</p>

        {whatsapp ? (
          <a
            href={whatsappUrl(whatsapp, `Olá! Preciso de ajuda com minha placa ${session?.plate ?? ""}.`)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 py-2"
          >
            <MessageCircle size={20} style={{ color: "var(--portal-accent)" }} />
            <div>
              <p className="portal-text-muted text-xs">WhatsApp Corporativo</p>
              <p className="portal-text font-semibold text-sm">{whatsapp}</p>
            </div>
          </a>
        ) : null}

        {phone ? (
          <a href={`tel:${phone.replace(/\D/g, "")}`} className="flex items-center gap-3 py-2">
            <Phone size={20} style={{ color: "var(--portal-accent)" }} />
            <div>
              <p className="portal-text-muted text-xs">Telefone da Oficina</p>
              <p className="portal-text font-semibold text-sm">{phone}</p>
            </div>
          </a>
        ) : null}

        {address ? (
          <div className="flex items-start gap-3 py-2">
            <MapPin size={20} className="shrink-0 mt-0.5" style={{ color: "var(--portal-accent)" }} />
            <div>
              <p className="portal-text-muted text-xs">Nosso Endereço</p>
              <p className="portal-text font-semibold text-sm">{address}</p>
            </div>
          </div>
        ) : null}
      </article>

      <article className="portal-card p-4">
        <div className="flex items-start gap-3">
          <Clock size={20} style={{ color: "var(--portal-accent)" }} />
          <div>
            <p className="portal-text font-semibold text-sm">Horário de atendimento</p>
            <p className="portal-text-muted text-xs mt-1 whitespace-pre-line">
              Segunda a Sexta: 08:00 às 18:00{"\n"}Sábado: 08:00 às 12:00
            </p>
          </div>
        </div>
      </article>

      {whatsapp ? (
        <a
          href={whatsappUrl(whatsapp, `Olá! Preciso de ajuda.`)}
          target="_blank"
          rel="noreferrer"
          className="block w-full h-12 rounded-xl text-white font-semibold text-center leading-[3rem] portal-primary-bg"
        >
          Falar no WhatsApp
        </a>
      ) : null}
    </div>
  );
}
