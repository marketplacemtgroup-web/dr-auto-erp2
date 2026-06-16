import { Users, Building2, Shield, Clock } from "lucide-react";
import { useAdminStats } from "../../hooks/useAdminStats";

function AdminCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-xl card-shadow p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[12px] font-medium text-[#64748B]">{label}</span>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={18} strokeWidth={1.5} style={{ color: iconColor }} />
        </div>
      </div>
      <div className="text-[28px] font-bold text-[#1E293B]">{value}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useAdminStats();

  return (
    <main className="px-6 pb-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-[#1E293B]">
          Painel administrativo
        </h1>
        <p className="text-[13px] text-[#64748B] mt-0.5">
          Usuários, filiais, permissões e acessos da organização
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AdminCard
          label="Usuarios ativos"
          value={isLoading ? "—" : (data?.activeUsers ?? 0)}
          icon={Users}
          iconBg="#EFF6FF"
          iconColor="#3B82F6"
        />
        <AdminCard
          label="Filiais cadastradas"
          value={isLoading ? "—" : (data?.branches ?? 0)}
          icon={Building2}
          iconBg="#ECFDF5"
          iconColor="#10B981"
        />
        <AdminCard
          label="Permissoes pendentes"
          value={isLoading ? "—" : (data?.pendingPermissions ?? 0)}
          icon={Shield}
          iconBg="#FFF7ED"
          iconColor="#F97316"
        />
        <AdminCard
          label="Ultimos acessos"
          value={isLoading ? "—" : (data?.recentAccess?.length ?? 0)}
          icon={Clock}
          iconBg="#EDE9FE"
          iconColor="#8B5CF6"
        />
      </div>

      <div className="bg-white rounded-xl card-shadow p-5">
        <h3 className="text-[14px] font-semibold text-[#1E293B] mb-4">
          Historico de acessos
        </h3>
        <div className="divide-y divide-[#F1F5F9]">
          {(data?.recentAccess ?? []).map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between py-3 text-sm"
            >
              <div>
                <p className="font-medium text-[#1E293B]">
                  {log.user?.name ?? "Usuário"}
                </p>
                <p className="text-[#64748B] text-xs">{log.user?.email}</p>
              </div>
              <span className="text-[#94A3B8] text-xs">
                {new Date(log.createdAt).toLocaleString("pt-BR")}
              </span>
            </div>
          ))}
          {!isLoading && !data?.recentAccess?.length && (
            <p className="text-[#94A3B8] text-sm py-4">Nenhum acesso registrado</p>
          )}
        </div>
      </div>
    </main>
  );
}
