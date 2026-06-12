import type { PortalDashboard } from "../../lib/api";
import LicensePlate from "./LicensePlate";

export default function VehicleCard({ vehicle }: { vehicle: PortalDashboard["vehicle"] }) {
  const label = [vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "Veículo";
  const year = vehicle.year ? `Ano ${vehicle.year}` : null;

  return (
    <article
      className="portal-card p-4"
      style={{ borderColor: "var(--portal-accent)", borderWidth: 2 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="portal-text font-black text-lg leading-tight">{label}</p>
          {year ? <p className="portal-text-muted text-sm mt-1">{year}</p> : null}
        </div>
        <span
          className="text-[10px] font-bold uppercase px-2 py-1 rounded-full"
          style={{ background: "var(--portal-success)", color: "#fff" }}
        >
          Em dia
        </span>
      </div>
      <div className="mt-4">
        <LicensePlate plate={vehicle.plate} />
      </div>
    </article>
  );
}
