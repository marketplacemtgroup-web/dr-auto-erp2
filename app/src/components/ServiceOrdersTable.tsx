import { routes } from "../lib/routes";
import NavButton from "./NavButton";
import StatusBadge from "./StatusBadge";
import { useDashboardServiceOrdersInProgress } from "../hooks/useDashboardLists";
import { serviceOrderStatusToVariant } from "../lib/serviceOrderStatus";

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} - ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function ServiceOrdersTable() {
  const { data: orders = [], isLoading } = useDashboardServiceOrdersInProgress();

  return (
    <div className="bg-white rounded-xl card-shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-semibold text-[#1E293B]">
          Ordens de Servico em Andamento
        </h3>
        <NavButton
          to={routes.ordemDeServico}
          className="text-[12px] text-[#94A3B8] hover:text-[#0E7490] transition-colors"
        >
          Ver todas
        </NavButton>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E2E8F0]">
              <th className="text-left text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider pb-2 pr-2">
                OS
              </th>
              <th className="text-left text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider pb-2 pr-2">
                Cliente / Veiculo
              </th>
              <th className="text-left text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider pb-2 pr-2">
                Status
              </th>
              <th className="text-left text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider pb-2">
                Previsao
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && orders.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-[13px] text-[#64748B]">
                  Carregando...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-[13px] text-[#64748B]">
                  Nenhuma ordem de servico em andamento.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const vehicleLabel = [order.vehicle.brand, order.vehicle.model]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <tr
                    key={order.id}
                    className="border-b border-[#F1F5F9] last:border-b-0 hover:bg-[#FAFBFC] transition-colors"
                  >
                    <td className="py-3 pr-2">
                      <span className="text-[12px] font-medium text-[#0E7490]">
                        #{order.number}
                      </span>
                    </td>
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-3 min-w-[180px]">
                        <div className="w-10 h-10 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-[10px] text-[#94A3B8]">
                          OS
                        </div>
                        <div>
                          <p className="text-[12px] font-medium text-[#1E293B]">
                            {order.vehicle.customer.name}
                          </p>
                          <p className="text-[11px] text-[#94A3B8]">
                            {vehicleLabel || "Veiculo"} · {order.vehicle.plate}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-2">
                      <StatusBadge variant={serviceOrderStatusToVariant(order.status)} />
                    </td>
                    <td className="py-3">
                      <span className="text-[12px] text-[#64748B]">
                        {formatDateTime(order.estimatedAt)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
