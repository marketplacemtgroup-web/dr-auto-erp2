import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, ClipboardList } from "lucide-react";
import EmptyState from "../components/portal/EmptyState";
import { formatMoney } from "../lib/format";
import { isFinished, isInProgress } from "../lib/portal-status";
import { osStatusLabel } from "../lib/service-order-status";
import { routes } from "../lib/routes";
import { usePortalStore } from "../stores/portalStore";

type FilterTab = "todas" | "andamento" | "finalizadas";

const tabs: { id: FilterTab; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "andamento", label: "Em andamento" },
  { id: "finalizadas", label: "Finalizadas" },
];

export default function PortalOrdersPage() {
  const navigate = useNavigate();
  const dashboard = usePortalStore((s) => s.dashboard);
  const [tab, setTab] = useState<FilterTab>("todas");

  const orders = useMemo(() => {
    const all = dashboard?.serviceOrders ?? [];
    if (tab === "andamento") return all.filter((so) => isInProgress(so.status));
    if (tab === "finalizadas") return all.filter((so) => isFinished(so.status));
    return all;
  }, [dashboard?.serviceOrders, tab]);

  return (
    <div className="space-y-4">
      <h1 className="portal-text text-2xl font-black">Minhas OS</h1>

      <div className="portal-card p-1 flex gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="flex-1 rounded-lg py-2 text-xs font-semibold transition-colors"
            style={{
              background: tab === t.id ? "var(--portal-primary)" : "transparent",
              color: tab === t.id ? "#fff" : "var(--portal-text-muted)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="portal-card">
          <EmptyState
            icon={ClipboardList}
            title="Nenhuma Ordem de Serviço"
            description="Nenhum registro encontrado nesta categoria."
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {orders.map((so) => (
            <li key={so.id}>
              <button
                type="button"
                onClick={() => navigate(routes.serviceOrder(so.id))}
                className="portal-card w-full flex items-center gap-3 p-4 text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="portal-text font-bold">OS #{so.number}</p>
                  <p className="portal-accent text-sm">{osStatusLabel(so.status)}</p>
                  {so.complaint ? (
                    <p className="portal-text-muted text-xs mt-1 truncate">{so.complaint}</p>
                  ) : null}
                </div>
                <span className="portal-text font-bold text-sm">{formatMoney(so.totalAmount)}</span>
                <ChevronRight size={18} className="portal-text-muted shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
