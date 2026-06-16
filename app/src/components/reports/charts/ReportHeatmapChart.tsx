import type { ReportsFull } from "../../../lib/api";

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

type Cell = ReportsFull["operations"]["ordersHeatmap"][number];

export default function ReportHeatmapChart({ cells }: { cells?: Cell[] }) {
  const safeCells = cells ?? [];
  const max = Math.max(1, ...safeCells.map((c) => c.count));

  function countAt(dow: number, hour: number) {
    return safeCells.find((c) => c.dow === dow && c.hour === hour)?.count ?? 0;
  }

  function cellColor(count: number) {
    if (count === 0) return "#F8FAFC";
    const intensity = count / max;
    if (intensity > 0.66) return "#0E7490";
    if (intensity > 0.33) return "#67C4D8";
    return "#BAE6FD";
  }

  if (!safeCells.some((c) => c.count > 0)) {
    return <p className="text-sm text-[#94A3B8] py-10 text-center">Sem OS abertas no periodo.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        <div className="grid grid-cols-[40px_repeat(13,minmax(0,1fr))] gap-1 text-[10px]">
          <div />
          {HOURS.map((h) => (
            <div key={h} className="text-center text-[#94A3B8] font-medium">
              {h}h
            </div>
          ))}
          {DAYS.map((day, dow) => (
            <div key={day} className="contents">
              <div className="flex items-center text-[#64748B] font-medium pr-1">{day}</div>
              {HOURS.map((hour) => {
                const count = countAt(dow, hour);
                return (
                  <div
                    key={`${dow}-${hour}`}
                    title={`${day} ${hour}h — ${count} OS`}
                    className="aspect-square rounded-md flex items-center justify-center text-[10px] font-semibold"
                    style={{
                      backgroundColor: cellColor(count),
                      color: count > 0 && count / max > 0.33 ? "#fff" : "#64748B",
                    }}
                  >
                    {count > 0 ? count : ""}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#94A3B8] mt-2">
          Intensidade = quantidade de OS abertas por dia da semana e horario
        </p>
      </div>
    </div>
  );
}
