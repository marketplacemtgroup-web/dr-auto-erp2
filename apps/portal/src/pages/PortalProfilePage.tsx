import { useNavigate } from "react-router";
import {
  Car,
  ChevronRight,
  Clock,
  Headphones,
  LogOut,
  Shield,
  User,
} from "lucide-react";
import { routes } from "../lib/routes";
import { usePortalStore } from "../stores/portalStore";

const menuItems = [
  { id: "dados", label: "Meus Dados", icon: User, to: routes.profileData },
  { id: "vehicles", label: "Meus Veículos", icon: Car, to: routes.profileVehicles },
  { id: "history", label: "Histórico de Serviços", icon: Clock, to: routes.profileHistory },
  { id: "support", label: "Suporte Técnico", icon: Headphones, to: routes.profileSupport },
  { id: "privacy", label: "Políticas de Privacidade", icon: Shield, to: routes.profilePrivacy },
] as const;

function maskCpf() {
  return "***.***.***-**";
}

export default function PortalProfilePage() {
  const navigate = useNavigate();
  const dashboard = usePortalStore((s) => s.dashboard);
  const session = usePortalStore((s) => s.session);
  const logout = usePortalStore((s) => s.logout);

  const customerName = dashboard?.customer.name ?? session?.customerName ?? "Cliente";
  const phone = dashboard?.customer.phone ?? dashboard?.customer.whatsapp ?? "—";
  const orgName = dashboard?.organization.name ?? session?.organizationName ?? "Oficina";
  const orgAddress = dashboard?.organization.address ?? "Endereço não informado";

  function handleLogout() {
    logout();
    navigate(routes.login);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="portal-text text-2xl font-black">Perfil / Suporte</h1>
        <p className="portal-text-muted text-sm mt-1">Gerencie seus dados e encontre ajuda</p>
      </div>

      <article className="portal-card p-4">
        <div className="flex items-center gap-4">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--portal-primary) 20%, transparent)" }}
          >
            <User size={32} style={{ color: "var(--portal-accent)" }} />
          </div>
          <div>
            <p className="portal-text font-black text-lg">{customerName}</p>
            <p className="portal-text-muted text-sm">CPF: {maskCpf()}</p>
            <p className="portal-text-muted text-sm">{phone}</p>
          </div>
        </div>
      </article>

      <button
        type="button"
        onClick={() => navigate(routes.profileSupport)}
        className="portal-card w-full p-4 text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="portal-accent text-xs font-bold uppercase">Oficina vinculada</p>
            <p className="portal-text font-bold">{orgName}</p>
            <p className="portal-text-muted text-xs mt-1 line-clamp-2">{orgAddress}</p>
          </div>
          <ChevronRight size={20} className="portal-accent shrink-0" />
        </div>
      </button>

      <div className="space-y-2">
        <p className="portal-text-muted text-xs font-semibold uppercase px-1">Opções</p>
        {menuItems.map(({ label, icon: Icon, to }) => (
          <button
            key={to}
            type="button"
            onClick={() => navigate(to)}
            className="portal-card w-full flex items-center gap-3 p-4 text-left"
          >
            <Icon size={22} style={{ color: "var(--portal-accent)" }} />
            <span className="portal-text font-medium flex-1">{label}</span>
            <ChevronRight size={18} className="portal-text-muted" />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 text-red-600 font-semibold"
      >
        <LogOut size={20} />
        Sair do portal
      </button>
    </div>
  );
}
