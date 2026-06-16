import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, ExternalLink, MessageCircle, X } from "lucide-react";
import { copyTextToClipboard } from "../../lib/clipboard";
import { whatsAppShareUrl } from "../../lib/shareLink";

export type ShareLinkDialogData = {
  title: string;
  subtitle?: string;
  url: string;
  expiresAt: string;
  whatsappMessage: string;
  whatsappPhone?: string | null;
};

type Props = {
  data: ShareLinkDialogData | null;
  onClose: () => void;
};

export default function ShareLinkDialog({ data, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!data) return;
    setCopied(false);
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
  }, [data, onClose]);

  if (!data) return null;

  const validity = new Date(data.expiresAt).toLocaleDateString("pt-BR");
  const waUrl = whatsAppShareUrl(data.whatsappMessage, data.whatsappPhone);

  async function handleCopy() {
    const ok = await copyTextToClipboard(data!.url);
    setCopied(ok);
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-[#E2E8F0] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-semibold text-[#1E293B]">{data.title}</h3>
            {data.subtitle && <p className="text-sm text-[#64748B] mt-1">{data.subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-[#94A3B8] mt-3">Válido até {validity}</p>

        <label className="block text-xs font-medium text-[#64748B] mt-3 mb-1">Link para o cliente</label>
        <input
          readOnly
          value={data.url}
          onFocus={(e) => e.target.select()}
          className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#1E293B] font-mono"
        />

        <p className="text-xs text-[#64748B] mt-3 leading-relaxed">
          O cliente abre no celular, vê o orçamento/OS e pode usar Imprimir / PDF para salvar. Envie
          pelo WhatsApp abaixo.
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-[#E2E8F0] text-sm text-[#1E293B] hover:bg-[#F8FAFC]"
          >
            <Copy size={16} />
            {copied ? "Copiado!" : "Copiar link"}
          </button>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[#25D366] text-white text-sm font-medium hover:bg-[#1da851]"
          >
            <MessageCircle size={16} />
            Enviar WhatsApp
          </a>
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-[#0E7490] text-sm text-[#0E7490] hover:bg-[#ECFEFF]"
          >
            <ExternalLink size={16} />
            Abrir
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}
