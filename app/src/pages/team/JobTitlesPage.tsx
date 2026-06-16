import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModulePageShell from "../../components/modules/ModulePageShell";
import FormDrawer, { FormField, inputClass } from "../../components/modules/FormDrawer";
import DataTable from "../../components/modules/DataTable";
import { api, type JobTitleRow } from "../../lib/api";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";

export default function JobTitlesPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", isTechnical: false });

  const { data, isLoading, error } = useApiQuery(["job-titles"], (t) => api.jobTitles(t));

  const save = useMutation({
    mutationFn: () => api.createJobTitle(token!, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-titles"] });
      setDrawerOpen(false);
      setForm({ name: "", description: "", isTechnical: false });
    },
  });

  return (
    <>
      <ModulePageShell
        title="Cargos"
        description="Defina os cargos da sua equipe e permissões técnicas."
        actionLabel="Novo cargo"
        onAction={() => setDrawerOpen(true)}
      >
        <DataTable
          loading={isLoading}
          error={error ?? null}
          columns={[
            { key: "name", header: "Cargo", render: (r: JobTitleRow) => r.name },
            {
              key: "tech",
              header: "Técnico",
              render: (r: JobTitleRow) => (r.isTechnical ? "Sim" : "Não"),
            },
            {
              key: "count",
              header: "Funcionários",
              render: (r: JobTitleRow) => String(r._count?.employees ?? 0),
            },
            {
              key: "status",
              header: "Status",
              render: (r: JobTitleRow) => (r.isActive ? "Ativo" : "Inativo"),
            },
          ]}
          rows={data ?? []}
        />
      </ModulePageShell>

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Novo cargo"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        loading={save.isPending}
      >
        <FormField label="Nome *">
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </FormField>
        <FormField label="Descrição">
          <input
            className={inputClass}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isTechnical}
            onChange={(e) => setForm((f) => ({ ...f, isTechnical: e.target.checked }))}
          />
          Cargo técnico (pode executar serviços)
        </label>
      </FormDrawer>
    </>
  );
}
