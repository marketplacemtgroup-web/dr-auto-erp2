import { useMemo } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, ClipboardList } from "lucide-react";
import EmptyState from "../../components/portal/EmptyState";
import { PortalSubpageHeader } from "../../components/portal/PortalAppLayout";
import { formatMoney } from "../../lib/format";
import { isFinished } from "../../lib/portal-status";
import { osStatusLabel } from "../../lib/service-order-status";
import { routes } from "../../lib/routes";
import { usePortalStore } from "../../stores/portalStore";

export default function PortalProfileHistoryPage() {
  const navigate = useNavigate();
  const dashboard = usePortalStore((s) => s.dashboard);

  const history = useMemo(
    () => (dashboard?.serviceOrders ?? []).filter((so) => isFinished(so.status)),
    [dashboard?.serviceOrders],
  );

  return (
    <div className="space-y-4">
      <PortalSubpageHeader title="Histórico de Serviços" backTo={routes.profile} />

      {history.length === 0 ? (
        <div className="portal-card">
          <EmptyState
            icon={ClipboardList}
            title="Sem histórico"
            description="Serviços finalizados aparecerão aqui."
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {history.map((so) => (
            <li key={so.id}>
              <button
                type="button"
                onClick={() => navigate(routes.serviceOrder(so.id))}
                className="portal-card w-full flex items-center gap-3 p-4 text-left"
              >
                <div className="flex-1">
                  <p className="portal-text font-bold">OS #{so.number}</p>
                  <p className="portal-accent text-sm">{osStatusLabel(so.status)}</p>
                </div>
                <span className="portal-text font-bold text-sm">{formatMoney(so.totalAmount)}</span>
                <ChevronRight size={18} className="portal-text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
