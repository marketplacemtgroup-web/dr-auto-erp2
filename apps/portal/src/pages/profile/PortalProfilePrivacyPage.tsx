import { PortalSubpageHeader } from "../../components/portal/PortalAppLayout";
import { branding } from "../../lib/branding";
import { routes } from "../../lib/routes";

export default function PortalProfilePrivacyPage() {
  return (
    <div className="space-y-4">
      <PortalSubpageHeader title="Políticas de Privacidade" backTo={routes.profile} />
      <article className="portal-card p-4 space-y-4 portal-text-muted text-sm leading-relaxed">
        <p>
          O portal do cliente {branding.appName} utiliza seus dados (CPF e placa do veículo) apenas
          para autenticação e exibição das ordens de serviço vinculadas ao seu cadastro na oficina.
        </p>
        <p>
          Não compartilhamos suas informações com terceiros, exceto quando necessário para a
          prestação do serviço automotivo contratado com a oficina.
        </p>
        <p>
          As fotos, vídeos e documentos exibidos no portal são liberados pela oficina e ficam
          disponíveis somente para o titular do veículo autenticado.
        </p>
        <p>
          Para solicitar exclusão de dados ou esclarecimentos, entre em contato diretamente com a
          oficina vinculada ao seu cadastro.
        </p>
      </article>
    </div>
  );
}
