import ModulePageShell from "../../components/modules/ModulePageShell";
import { useApiQuery } from "../../hooks/useApiQuery";
import { api } from "../../lib/api";

export default function PermissionsPage() {
  const { data: roles, isLoading } = useApiQuery(["roles"], (t) => api.roles(t));
  const { data: permissions } = useApiQuery(["permissions"], (t) => api.permissions(t));

  const modules = [...new Set((permissions ?? []).map((p: { module: string }) => p.module))];

  return (
    <ModulePageShell
      title="Permissões por Perfil"
      description="Configure o que cada perfil de acesso pode ver e fazer no sistema."
    >
      {isLoading ? (
        <p className="text-sm text-[#6B7280]">Carregando...</p>
      ) : (
        <div className="space-y-6">
          {(roles ?? []).map((role: { id: string; name: string; slug: string; permissions: Array<{ permission: { slug: string; name: string; module: string } }> }) => (
            <div key={role.id} className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5">
              <h3 className="font-semibold text-[#111827] mb-1">{role.name}</h3>
              <p className="text-xs text-[#6B7280] mb-4">Slug: {role.slug}</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {role.permissions.map((rp) => (
                  <div
                    key={rp.permission.slug}
                    className="text-xs px-2 py-1.5 rounded bg-[#F7F8FA] text-[#374151]"
                  >
                    {rp.permission.name}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5">
            <h3 className="font-semibold text-[#111827] mb-4">Módulos do sistema</h3>
            <div className="flex flex-wrap gap-2">
              {modules.map((m) => (
                <span
                  key={m}
                  className="text-xs font-medium px-3 py-1 rounded-full bg-[#0057D9]/10 text-[#0057D9]"
                >
                  {m}
                </span>
              ))}
            </div>
            <p className="text-xs text-[#6B7280] mt-4">
              Perfis padrão: Admin (tudo), Gerente, Recepção, Mecânico, Estoque, Financeiro,
              Vendedor e Consulta. Edição avançada de roles em breve.
            </p>
          </div>
        </div>
      )}
    </ModulePageShell>
  );
}
