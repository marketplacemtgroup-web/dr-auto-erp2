import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { Search } from "lucide-react";
import { api, type GlobalSearchResult } from "../lib/api";
import { routes } from "../lib/routes";
import { useAuthStore } from "../stores/authStore";
import { serviceOrderStatusLabel } from "../lib/labels";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function GlobalSearchDialog({ open, onClose }: Props) {
  const token = useAuthStore((s) => s.session?.accessToken ?? null);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GlobalSearchResult | null>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setData(null);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !token || q.trim().length < 2) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    const t = setTimeout(() => {
      setLoading(true);
      setError(null);
      api
        .globalSearch(token, q.trim())
        .then((result) => {
          setData(result);
          setError(null);
        })
        .catch((err: unknown) => {
          setData(null);
          setError(err instanceof Error ? err.message : "Erro ao buscar");
        })
        .finally(() => setLoading(false));
    }, 280);
    return () => clearTimeout(t);
  }, [q, open, token]);

  if (!open) return null;

  function go(path: string) {
    navigate(path);
    onClose();
  }

  const trimmed = q.trim();
  const hasQuery = trimmed.length >= 2;
  const empty =
    hasQuery &&
    !loading &&
    !error &&
    data &&
    !data.customers.length &&
    !data.vehicles.length &&
    !data.serviceOrders.length &&
    !data.quotes.length;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Fechar busca"
      />
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Busca global"
      >
        <div className="flex items-center gap-2 px-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <Search size={18} className="text-[#94A3B8] shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cliente, placa, OS #, orcamento #..."
            className="flex-1 h-12 text-[14px] outline-none bg-transparent"
          />
          <kbd className="text-[10px] text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded shrink-0">ESC</kbd>
        </div>
        <div className="max-h-[min(60vh,520px)] overflow-y-auto p-2">
          {!hasQuery ? (
            <p className="text-sm text-[#94A3B8] px-3 py-4">Digite pelo menos 2 caracteres.</p>
          ) : loading ? (
            <p className="text-sm text-[#94A3B8] px-3 py-4">Buscando...</p>
          ) : error ? (
            <p className="text-sm text-red-600 px-3 py-4">{error}</p>
          ) : empty ? (
            <p className="text-sm text-[#94A3B8] px-3 py-4">Nenhum resultado para &quot;{trimmed}&quot;.</p>
          ) : data ? (
            <>
              {data.customers.length > 0 && (
                <Section title="Clientes">
                  {data.customers.map((c) => (
                    <ResultRow
                      key={c.id}
                      label={c.name}
                      sub={c.phone ?? c.document ?? ""}
                      onClick={() => go(routes.clienteDetalhe(c.id))}
                    />
                  ))}
                </Section>
              )}
              {data.vehicles.length > 0 && (
                <Section title="Veiculos">
                  {data.vehicles.map((v) => (
                    <ResultRow
                      key={v.id}
                      label={v.plate}
                      sub={[v.brand, v.model, v.customer.name].filter(Boolean).join(" · ")}
                      onClick={() => go(routes.veiculoDetalhe(v.id))}
                    />
                  ))}
                </Section>
              )}
              {data.serviceOrders.length > 0 && (
                <Section title="Ordens de servico">
                  {data.serviceOrders.map((o) => (
                    <ResultRow
                      key={o.id}
                      label={`OS #${o.number}`}
                      sub={`${o.vehicle.plate} — ${serviceOrderStatusLabel[o.status] ?? o.status}`}
                      onClick={() => go(routes.ordemDeServicoDetalhe(o.id))}
                    />
                  ))}
                </Section>
              )}
              {data.quotes.length > 0 && (
                <Section title="Orcamentos">
                  {data.quotes.map((quote) => (
                    <ResultRow
                      key={quote.id}
                      label={`Orc. #${quote.number ?? "—"}`}
                      sub={`OS #${quote.serviceOrder.number} · ${quote.serviceOrder.vehicle.plate}`}
                      onClick={() => go(routes.ordemDeServicoDetalhe(quote.serviceOrder.id))}
                    />
                  ))}
                </Section>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8] px-3 py-1">{title}</p>
      {children}
    </div>
  );
}

function ResultRow({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F0FDFA] text-[13px]"
    >
      <span className="font-medium text-[#1E293B] block">{label}</span>
      {sub ? <span className="text-[12px] text-[#64748B]">{sub}</span> : null}
    </button>
  );
}
