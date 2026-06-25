import { routes } from "../lib/routes";
import NavButton from "./NavButton";
import { useDashboardBundleContext } from "../contexts/DashboardBundleContext";
import { useDashboardPendingQuotes } from "../hooks/useDashboardLists";
import { usePermissions } from "../hooks/usePermissions";
import { formatMoney } from "../lib/format";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "agora";
  if (hours < 24) return `${hours}h atras`;
  const days = Math.floor(hours / 24);
  return `${days} dia${days > 1 ? "s" : ""} atras`;
}

export default function PendingQuotes() {
  const bundle = useDashboardBundleContext();
  const fallback = useDashboardPendingQuotes(bundle === null);
  const quotes = bundle?.charts.data?.pendingQuotes ?? fallback.data ?? [];
  const isLoading = bundle ? bundle.charts.isPending : fallback.isLoading;
  const { canViewMoney } = usePermissions();
  const showMoney = canViewMoney();

  return (
    <div className="bg-white rounded-xl card-shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-semibold text-[#1E293B]">
          Orcamentos Pendentes
        </h3>
        <NavButton
          to={routes.orcamentos}
          className="text-[12px] text-[#94A3B8] hover:text-[#0E7490] transition-colors"
        >
          Ver todos
        </NavButton>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E2E8F0]">
              <th className="text-left text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider pb-2 pr-2">
                Orcamento
              </th>
              <th className="text-left text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider pb-2 pr-2">
                Cliente
              </th>
              {showMoney && (
                <th className="text-right text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider pb-2">
                  Valor
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading && quotes.length === 0 ? (
              <tr>
                <td
                  colSpan={showMoney ? 3 : 2}
                  className="py-6 text-center text-[13px] text-[#64748B]"
                >
                  Carregando...
                </td>
              </tr>
            ) : quotes.length === 0 ? (
              <tr>
                <td
                  colSpan={showMoney ? 3 : 2}
                  className="py-6 text-center text-[13px] text-[#64748B]"
                >
                  Nenhum orcamento pendente.
                </td>
              </tr>
            ) : (
              quotes.map((q) => (
                <tr
                  key={q.id}
                  className="border-b border-[#F1F5F9] last:border-b-0 hover:bg-[#FAFBFC] transition-colors"
                >
                  <td className="py-3 pr-2">
                    <span className="text-[12px] font-medium text-[#0E7490]">
                      OS #{q.serviceOrder.number}
                    </span>
                    <p className="text-[11px] text-[#94A3B8]">{timeAgo(q.createdAt)}</p>
                  </td>
                  <td className="py-3 pr-2">
                    <p className="text-[12px] font-medium text-[#1E293B]">
                      {q.serviceOrder.vehicle.customer.name}
                    </p>
                    <p className="text-[11px] text-[#94A3B8]">
                      {q.serviceOrder.vehicle.plate}
                    </p>
                  </td>
                  {showMoney && (
                    <td className="py-3 text-right">
                      <span className="text-[12px] font-semibold text-[#1E293B]">
                        {formatMoney(Number(q.amount))}
                      </span>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
