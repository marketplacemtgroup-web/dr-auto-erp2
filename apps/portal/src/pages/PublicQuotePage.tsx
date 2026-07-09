import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import { Loader2, Printer } from "lucide-react";
import QuoteDetailContent from "../components/portal/QuoteDetailContent";
import QuotePrintPhotos from "../components/portal/QuotePrintPhotos";
import QuoteSheetLayout from "../components/portal/QuoteSheetLayout";
import { ApiError, api } from "../lib/api";
import { buildApprovePayload } from "../lib/quote-lines";

export default function PublicQuotePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.publicQuote>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api.publicQuote(token));
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "Link inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve() {
    if (!token || !data) return;
    setActing(true);
    try {
      const payload = buildApprovePayload(data.quote.lines ?? []);
      const updated = await api.publicApproveQuote(token, payload);
      setData({ ...data, quote: updated });
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao aprovar");
    } finally {
      setActing(false);
    }
  }

  async function reject() {
    if (!token) return;
    if (!confirm("Recusar este orçamento?")) return;
    setActing(true);
    try {
      const updated = await api.publicRejectQuote(token);
      setData((prev) => (prev ? { ...prev, quote: updated } : prev));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao recusar");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] text-[#64748B]">
        <Loader2 className="animate-spin mr-2" size={20} />
        Carregando orçamento...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] px-4">
        <p className="text-red-600 text-center">{error ?? "Orçamento não encontrado."}</p>
      </div>
    );
  }

  return (
    <QuoteSheetLayout
      organizationName={data.organizationName}
      customerName={data.customerName}
      vehiclePlate={data.vehicle.plate}
      headerAction={
        <button
          type="button"
          onClick={() => window.print()}
          className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
        >
          <Printer size={16} />
          PDF
        </button>
      }
    >
      <QuoteDetailContent
        quote={data.quote}
        busy={acting}
        onApprove={() => void approve()}
        onReject={() => void reject()}
      />
      <QuotePrintPhotos
        photos={data.attachments.map((a) => ({
          url: a.url,
          label: a.fileName,
          mimeType: a.mimeType,
        }))}
      />
    </QuoteSheetLayout>
  );
}
