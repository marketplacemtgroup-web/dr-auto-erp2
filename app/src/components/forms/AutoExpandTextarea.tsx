import { useEffect, useRef } from "react";
import { inputClass } from "../modules/FormDrawer";

type AutoExpandTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minRows?: number;
  maxRows?: number;
  className?: string;
};

export default function AutoExpandTextarea({
  value,
  onChange,
  placeholder,
  disabled = false,
  minRows = 5,
  maxRows = 24,
  className = "",
}: AutoExpandTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = Number.parseInt(getComputedStyle(el).lineHeight, 10) || 22;
    const padding = 24;
    const minHeight = lineHeight * minRows + padding;
    const maxHeight = lineHeight * maxRows + padding;
    const next = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value, minRows, maxRows]);

  return (
    <textarea
      ref={ref}
      className={`${inputClass} py-3 resize-none leading-relaxed ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={minRows}
    />
  );
}
