import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModulePageShell from "../../components/modules/ModulePageShell";
import FormDrawer, { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import KpiStrip from "../../components/modules/KpiStrip";
import DataTable from "../../components/modules/DataTable";
import ListPagination from "../../components/modules/ListPagination";
import { api, LIST_PAGE_SIZE, type EmployeeRow } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { routes } from "../../lib/routes";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";
import LoginUsernameField from "../../components/team/LoginUsernameField";
import {
  ACCESS_PROFILE_OPTIONS,
  accessProfileLabel,
  effectiveAccessProfile,
} from "./accessProfiles";

const PAYMENT_LABELS: Record<string, string> = {
  FIXO: "Salário fixo",
  FIXO_MAIS_COMISSAO: "Fixo + comissão",
  SOMENTE_COMISSAO: "Somente comissão",
  DIARIA: "Diária",
  POR_SERVICO: "Por serviço",
  TERCEIRIZADO: "Terceirizado",
};

const EMPTY_FORM = {
  name: "",
  cpf: "",
  phone: "",
  email: "",
  jobTitleId: "",
  employmentType: "CLT",
  status: "ACTIVE",
  isTechnical: false,
  accessProfile: "",
  createAccess: false,
  loginUsername: "",
  password: "",
  accessActive: true,
  paymentType: "FIXO_MAIS_COMISSAO",
  fixedSalary: "",
  paymentDay: "5",
  pixKey: "",
};

export default function EmployeesPage() {
  const navigate = useNavigate();
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState<"dados" | "pagamento" | "acesso">("dados");
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: stats } = useApiQuery(["team-stats"], (t) => api.teamStats(t));
  const { data: jobTitles } = useApiQuery(["job-titles"], (t) => api.jobTitles(t));
  const { data: loginDomain } = useApiQuery(["team-login-domain"], (t) =>
    api.teamLoginEmailDomain(t),
  );
  const { data, isLoading, error } = useApiQuery(
    ["employees", search, statusFilter, String(page)],
    (t) =>
      api.employees(t, {
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        limit: LIST_PAGE_SIZE,
      }),
  );

  const rows = data?.data ?? [];
  const totalPages = data?.pagination.totalPages ?? 0;

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const save = useMutation({
    mutationFn: async () => {
      const emp = await api.createEmployee(token!, {
        name: form.name,
        cpf: form.cpf || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        jobTitleId: form.jobTitleId || undefined,
        employmentType: form.employmentType,
        status: form.status,
        isTechnical: form.isTechnical,
        ...(form.createAccess
          ? {
              createAccess: true,
              loginUsername: form.loginUsername,
              password: form.password,
              accessProfile: form.accessProfile,
              accessActive: form.accessActive,
            }
          : {}),
      });
      if (form.paymentType) {
        await api.upsertEmployeePaymentConfig(token!, emp.id, {
          paymentType: form.paymentType,
          fixedSalary: form.fixedSalary ? Number(form.fixedSalary) : undefined,
          paymentDay: form.paymentDay ? Number(form.paymentDay) : undefined,
          pixKey: form.pixKey || undefined,
        });
      }
      return emp;
    },
    onSuccess: (emp) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["team-stats"] });
      setDrawerOpen(false);
      setForm(EMPTY_FORM);
      setTab("dados");
      navigate(routes.equipeFuncionarioDetalhe(emp.id));
    },
  });

  const openDrawer = () => {
    setForm(EMPTY_FORM);
    setTab("dados");
    setDrawerOpen(true);
  };

  const canSubmit =
    form.name.trim().length > 0 &&
    (!form.createAccess ||
      (form.accessProfile && form.loginUsername.trim() && form.password.length >= 6));

  return (
    <>
      <ModulePageShell
        title="Funcionários"
        description="Gerencie sua equipe, acessos, salários, comissões e produtividade."
        actionLabel="Novo funcionário"
        onAction={openDrawer}
        onSearch={(q) => {
          setSearch(q);
          setPage(1);
        }}
      >
        <KpiStrip
          items={[
            { label: "Funcionários ativos", value: String(stats?.activeEmployees ?? "—") },
            {
              label: "Comissões pendentes",
              value: formatMoney(stats?.pendingCommissions ?? 0),
              tone: "warning",
            },
            {
              label: "Pagamentos do mês",
              value: formatMoney(stats?.monthPayments ?? 0),
              tone: "success",
            },
            { label: "OS em execução", value: String(stats?.osInProgress ?? "—") },
          ]}
        />

        <div className="flex gap-2 mb-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">Todos os status</option>
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
          </select>
        </div>

        <DataTable
          loading={isLoading}
          error={error ?? null}
          columns={[
            { key: "name", header: "Nome", render: (r: EmployeeRow) => r.name },
            {
              key: "job",
              header: "Cargo",
              render: (r: EmployeeRow) => r.jobTitle?.name ?? "—",
            },
            {
              key: "profile",
              header: "Perfil",
              render: (r: EmployeeRow) =>
                accessProfileLabel(effectiveAccessProfile(r)),
            },
            {
              key: "login",
              header: "Login",
              render: (r: EmployeeRow) => r.member?.user?.email ?? "—",
            },
            {
              key: "payment",
              header: "Pagamento",
              render: (r: EmployeeRow) =>
                PAYMENT_LABELS[r.paymentConfig?.paymentType ?? ""] ?? "—",
            },
            {
              key: "status",
              header: "Status",
              render: (r: EmployeeRow) => (
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    r.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {r.status === "ACTIVE" ? "Ativo" : "Inativo"}
                </span>
              ),
            },
            {
              key: "month",
              header: "A pagar no mês",
              render: (r: EmployeeRow) => formatMoney(r.monthToPay ?? 0),
            },
            {
              key: "os",
              header: "OS em andamento",
              render: (r: EmployeeRow) => String(r.osInProgress ?? 0),
            },
          ]}
          rows={rows}
          onRowClick={(r) => navigate(routes.equipeFuncionarioDetalhe(r.id))}
        />
        <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </ModulePageShell>

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Novo funcionário"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          save.mutate();
        }}
        loading={save.isPending}
        size="xl"
      >
        <div className="flex gap-2 mb-4 border-b border-[#E5E7EB]">
          {(["dados", "pagamento", "acesso"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === t ? "border-[#0057D9] text-[#0057D9]" : "border-transparent text-[#6B7280]"
              }`}
            >
              {t === "dados"
                ? "Dados pessoais"
                : t === "pagamento"
                  ? "Pagamento"
                  : "Acesso ao sistema"}
            </button>
          ))}
        </div>

        {tab === "dados" && (
          <div className="space-y-4">
            <FormField label="Nome completo *">
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="CPF">
                <input
                  className={inputClass}
                  value={form.cpf}
                  onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
                />
              </FormField>
              <FormField label="Telefone">
                <input
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </FormField>
            </div>
            <FormField label="E-mail">
              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </FormField>
            <FormField label="Cargo">
              <select
                className={selectClass}
                value={form.jobTitleId}
                onChange={(e) => setForm((f) => ({ ...f, jobTitleId: e.target.value }))}
              >
                <option value="">Selecione</option>
                {(jobTitles ?? []).map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Vínculo">
              <select
                className={selectClass}
                value={form.employmentType}
                onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value }))}
              >
                <option value="CLT">CLT</option>
                <option value="AUTONOMO">Autônomo</option>
                <option value="MEI">MEI</option>
                <option value="TERCEIRIZADO">Terceirizado</option>
                <option value="COMISSIONADO">Comissionado</option>
              </select>
            </FormField>
            <label className="flex items-center gap-2 text-sm text-[#374151]">
              <input
                type="checkbox"
                checked={form.isTechnical}
                onChange={(e) => setForm((f) => ({ ...f, isTechnical: e.target.checked }))}
              />
              Funcionário técnico (pode executar serviços)
            </label>
          </div>
        )}

        {tab === "pagamento" && (
          <div className="space-y-4">
            <FormField label="Tipo de pagamento">
              <select
                className={selectClass}
                value={form.paymentType}
                onChange={(e) => setForm((f) => ({ ...f, paymentType: e.target.value }))}
              >
                <option value="FIXO">Salário fixo</option>
                <option value="FIXO_MAIS_COMISSAO">Salário fixo + comissão</option>
                <option value="SOMENTE_COMISSAO">Somente comissão</option>
                <option value="DIARIA">Diária</option>
                <option value="POR_SERVICO">Por serviço</option>
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Valor mensal (R$)">
                <input
                  type="number"
                  className={inputClass}
                  value={form.fixedSalary}
                  onChange={(e) => setForm((f) => ({ ...f, fixedSalary: e.target.value }))}
                />
              </FormField>
              <FormField label="Dia de pagamento">
                <input
                  type="number"
                  min={1}
                  max={31}
                  className={inputClass}
                  value={form.paymentDay}
                  onChange={(e) => setForm((f) => ({ ...f, paymentDay: e.target.value }))}
                />
              </FormField>
            </div>
            <FormField label="Chave Pix">
              <input
                className={inputClass}
                value={form.pixKey}
                onChange={(e) => setForm((f) => ({ ...f, pixKey: e.target.value }))}
              />
            </FormField>
          </div>
        )}

        {tab === "acesso" && (
          <div className="space-y-4">
            <p className="text-sm text-[#6B7280]">
              Crie um login para o funcionário acessar o sistema. Informe só o usuário antes do @
              {loginDomain?.loginEmailDomain ? (
                <>
                  {" "}
                  (<strong>@{loginDomain.loginEmailDomain}</strong>, definido no cadastro da
                  oficina)
                </>
              ) : null}
              . O perfil define as permissões.
            </p>
            <label className="flex items-center gap-2 text-sm text-[#374151]">
              <input
                type="checkbox"
                checked={form.createAccess}
                onChange={(e) => setForm((f) => ({ ...f, createAccess: e.target.checked }))}
              />
              Criar acesso ao sistema agora
            </label>

            {form.createAccess && (
              <>
                <LoginUsernameField
                  label="Usuário de login *"
                  username={form.loginUsername}
                  domain={loginDomain?.loginEmailDomain ?? ""}
                  onUsernameChange={(value) =>
                    setForm((f) => ({ ...f, loginUsername: value }))
                  }
                  placeholder="joao.silva"
                  required
                />
                <FormField label="Senha temporária * (mín. 6 caracteres)">
                  <input
                    type="password"
                    className={inputClass}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    autoComplete="new-password"
                  />
                </FormField>
                <FormField label="Perfil de acesso *">
                  <select
                    className={selectClass}
                    value={form.accessProfile}
                    onChange={(e) => setForm((f) => ({ ...f, accessProfile: e.target.value }))}
                  >
                    <option value="">Selecione o perfil</option>
                    {ACCESS_PROFILE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <label className="flex items-center gap-2 text-sm text-[#374151]">
                  <input
                    type="checkbox"
                    checked={form.accessActive}
                    onChange={(e) => setForm((f) => ({ ...f, accessActive: e.target.checked }))}
                  />
                  Acesso ativo (pode fazer login)
                </label>
              </>
            )}
          </div>
        )}
      </FormDrawer>
    </>
  );
}
