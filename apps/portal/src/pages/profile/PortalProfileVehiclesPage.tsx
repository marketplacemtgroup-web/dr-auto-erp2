import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import LicensePlate from "../../components/portal/LicensePlate";
import { PortalSubpageHeader } from "../../components/portal/PortalAppLayout";
import { routes } from "../../lib/routes";
import { usePortalStore } from "../../stores/portalStore";

export default function PortalProfileVehiclesPage() {
  const dashboard = usePortalStore((s) => s.dashboard);
  const vehicles = usePortalStore((s) => s.vehicles);
  const loadVehicles = usePortalStore((s) => s.loadVehicles);
  const switchVehicle = usePortalStore((s) => s.switchVehicle);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);

  const currentId = dashboard?.vehicle.id;

  useEffect(() => {
    void loadVehicles().finally(() => setLoading(false));
  }, [loadVehicles]);

  async function handleSwitch(vehicleId: string) {
    if (vehicleId === currentId) return;
    setSwitching(vehicleId);
    try {
      await switchVehicle(vehicleId);
    } finally {
      setSwitching(null);
    }
  }

  return (
    <div className="space-y-4">
      <PortalSubpageHeader title="Meus Veículos" backTo={routes.profile} />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin portal-text-muted" size={24} />
        </div>
      ) : vehicles.length === 0 ? (
        <p className="portal-text-muted text-sm text-center">Nenhum veículo cadastrado.</p>
      ) : (
        <ul className="space-y-2">
          {vehicles.map((v) => {
            const active = v.id === currentId;
            const label = [v.brand, v.model].filter(Boolean).join(" ") || "Veículo";
            return (
              <li key={v.id}>
                <button
                  type="button"
                  disabled={switching !== null}
                  onClick={() => void handleSwitch(v.id)}
                  className="portal-card w-full p-4 text-left"
                  style={{
                    borderColor: active ? "var(--portal-accent)" : undefined,
                    borderWidth: active ? 2 : 1,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="portal-text font-bold">{label}</p>
                      {v.year ? <p className="portal-text-muted text-xs">Ano {v.year}</p> : null}
                      <div className="mt-2">
                        <LicensePlate plate={v.plate} />
                      </div>
                    </div>
                    {active ? (
                      <Check size={22} style={{ color: "var(--portal-success)" }} />
                    ) : switching === v.id ? (
                      <Loader2 size={20} className="animate-spin portal-text-muted" />
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
