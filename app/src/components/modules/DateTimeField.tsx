import { useEffect, useRef, type FocusEvent } from "react";
import { inputClass } from "./FormDrawer";
import { joinDatetimeLocal, splitDatetimeLocal } from "../../lib/datetimeLocal";

type DateTimeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  /** Chamado ao sair do campo — recebe o valor atual (evita estado stale no blur). */
  onCommit?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
};

function openPicker(el: HTMLInputElement) {
  try {
    el.showPicker?.();
  } catch {
    el.focus();
  }
}

/** Data e hora em campos separados — funciona melhor em modais e no Windows. */
export default function DateTimeField({
  value,
  onChange,
  onCommit,
  required,
  disabled,
}: DateTimeFieldProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef(value);
  useEffect(() => {
    latestRef.current = value;
  }, [value]);

  const { date, time } = splitDatetimeLocal(value);

  function update(next: string) {
    latestRef.current = next;
    onChange(next);
  }

  function commitIfLeaving(e: FocusEvent<HTMLInputElement>) {
    const next = e.relatedTarget as Node | null;
    if (next && wrapRef.current?.contains(next)) return;
    onCommit?.(latestRef.current);
  }

  function onDateChange(nextDate: string) {
    update(joinDatetimeLocal(nextDate, time));
  }

  function onTimeChange(nextTime: string) {
    update(joinDatetimeLocal(date, nextTime));
  }

  return (
    <div ref={wrapRef} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <input
        type="date"
        className={`${inputClass} datetime-field min-h-10 cursor-pointer`}
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        onClick={(e) => openPicker(e.currentTarget)}
        onBlur={commitIfLeaving}
        required={required}
        disabled={disabled}
        aria-label="Data"
      />
      <input
        type="time"
        className={`${inputClass} datetime-field min-h-10 cursor-pointer`}
        value={time}
        onChange={(e) => onTimeChange(e.target.value)}
        onClick={(e) => openPicker(e.currentTarget)}
        onBlur={commitIfLeaving}
        required={required}
        disabled={disabled}
        step={60}
        aria-label="Hora"
      />
    </div>
  );
}
