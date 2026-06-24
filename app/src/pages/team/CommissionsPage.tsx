import { useMemo, useState } from "react";
import { Link } from "react-router";
import ModulePageShell from "../../components/modules/ModulePageShell";
import DataTable from "../../components/modules/DataTable";
import { selectClass } from "../../components/modules/FormDrawer";
import { api } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { routes } from "../../lib/routes";
import { useApiQuery } from "../../hooks/useApiQuery";

type CommissionRow = {
  id: string;
  description: string;
  commissionAmount: number | string;
  status: string;
  generatedAt: string;
  employee: { id: string; name: string };
  serviceOrder?: { id: string; number: number } | null;
};

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  APROVADA: "Aprovada",
  PAGA: "Paga",
  CANCELADA: "Cancelada",
};

export default function CommissionsPage() {
  const [employeeId, setEmployeeId] = useState("");
  const [status, setStatus] = useState("");

  const { data: employees = [] } = useApiQuery(["employees-picker"], (t) =>
    api.employees(t),
  );

  const { data: rows = [], isLoading } = useApiQuery<CommissionRow[]>(
    ["team-commissions", employeeId, status],
    (t) =>
      api.generatedCommissions(t, {
        employeeId: employeeId || undefined,
        status: status || undefined,
      }) as Promise<CommissionRow[]>,
  );

  const tableRows = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        id: r.id,
        employeeName: r.employee.name,
        osNumber: r.serviceOrder?.number ?? null,
        osId: r.serviceOrder?.id ?? null,
        generatedAtLabel: new Date(r.generatedAt).toLocaleString("pt-BR"),
        amountLabel: formatMoney(r.commissionAmount),
        statusLabel: STATUS_LABEL[r.status] ?? r.status,
      })),
    [rows],
  );

  return (
    <ModulePageShell
      title="Consulta de Comissões"
      description="Valores gerados por colaborador, OS e data de lançamento."
    >
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className={selectClass}
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
        >
          <option value="">Todos os colaboradores</option>
          {employees.map((e: { id: string; name: string }) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        loading={isLoading}
        rows={tableRows}
        emptyMessage="Nenhuma comissão encontrada."
        columns={[
          {
            key: "employeeName",
            header: "Colaborador",
            render: (r) => (
              <Link
                to={routes.equipeFuncionarioDetalhe((r as CommissionRow).employee.id)}
                className="text-[#0E7490] hover:underline"
              >
                {(r as { employeeName: string }).employeeName}
              </Link>
            ),
          },
          {
            key: "amountLabel",
            header: "Valor",
            className: "text-right",
            render: (r) => (
              <span className="font-medium block text-right">
                {(r as { amountLabel: string }).amountLabel}
              </span>
            ),
          },
          {
            key: "osNumber",
            header: "O.S.",
            render: (r) => {
              const row = r as { osNumber: number | null; osId: string | null };
              if (!row.osNumber || !row.osId) return "—";
              return (
                <Link
                  to={routes.ordemDeServicoDetalhe(row.osId)}
                  className="text-[#0E7490] hover:underline"
                >
                  #{row.osNumber}
                </Link>
              );
            },
          },
          {
            key: "generatedAtLabel",
            header: "Data",
            render: (r) => (r as { generatedAtLabel: string }).generatedAtLabel,
          },
          {
            key: "description",
            header: "Referente a",
            render: (r) => (r as { description: string }).description,
          },
          {
            key: "statusLabel",
            header: "Status",
            render: (r) => (r as { statusLabel: string }).statusLabel,
          },
        ]}
      />
    </ModulePageShell>
  );
}
