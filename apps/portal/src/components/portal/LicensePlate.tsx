export default function LicensePlate({ plate }: { plate: string }) {
  const clean = plate.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const display =
    clean.length === 7
      ? `${clean.slice(0, 3)}${clean.slice(3, 4)}${clean.slice(4)}`
      : clean;

  return (
    <div
      className="inline-flex items-center rounded-md overflow-hidden border-2 font-bold tracking-wider text-sm"
      style={{ borderColor: "#1e293b", background: "#fff", color: "#0f172a" }}
    >
      <span
        className="px-2 py-1.5 text-[10px] font-black text-white"
        style={{ background: "#003399" }}
      >
        BR
      </span>
      <span className="px-3 py-1.5">{display}</span>
    </div>
  );
}
