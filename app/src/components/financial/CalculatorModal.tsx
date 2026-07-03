import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Op = "+" | "-" | "*" | "/";

function compute(a: number, b: number, op: Op): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return b === 0 ? NaN : a / b;
  }
}

function formatDisplay(value: string): string {
  if (value === "Erro") return value;
  const [intPart, decPart] = value.split(".");
  const negative = intPart.startsWith("-");
  const digits = negative ? intPart.slice(1) : intPart;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const withSign = (negative ? "-" : "") + grouped;
  return decPart !== undefined ? `${withSign},${decPart}` : withSign;
}

export default function CalculatorModal({ open, onClose }: Props) {
  const [display, setDisplay] = useState("0");
  const [previous, setPrevious] = useState<number | null>(null);
  const [operator, setOperator] = useState<Op | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [expression, setExpression] = useState("");

  const clearAll = useCallback(() => {
    setDisplay("0");
    setPrevious(null);
    setOperator(null);
    setWaitingForOperand(false);
    setExpression("");
  }, []);

  const inputDigit = useCallback(
    (digit: string) => {
      setDisplay((prev) => {
        if (prev === "Erro") return digit;
        if (waitingForOperand) {
          setWaitingForOperand(false);
          return digit;
        }
        if (prev === "0") return digit;
        if (prev.replace(/[^\d]/g, "").length >= 15) return prev;
        return prev + digit;
      });
    },
    [waitingForOperand],
  );

  const inputDot = useCallback(() => {
    setDisplay((prev) => {
      if (prev === "Erro") return "0.";
      if (waitingForOperand) {
        setWaitingForOperand(false);
        return "0.";
      }
      if (prev.includes(".")) return prev;
      return prev + ".";
    });
  }, [waitingForOperand]);

  const toggleSign = useCallback(() => {
    setDisplay((prev) => {
      if (prev === "0" || prev === "Erro") return prev;
      return prev.startsWith("-") ? prev.slice(1) : "-" + prev;
    });
  }, []);

  const inputPercent = useCallback(() => {
    setDisplay((prev) => {
      if (prev === "Erro") return prev;
      const current = parseFloat(prev);
      if (Number.isNaN(current)) return prev;
      const base = previous !== null && operator ? previous : 1;
      const result =
        operator === "+" || operator === "-"
          ? (base * current) / 100
          : current / 100;
      return String(result);
    });
  }, [previous, operator]);

  const backspace = useCallback(() => {
    setDisplay((prev) => {
      if (prev === "Erro" || waitingForOperand) return prev;
      if (prev.length <= 1 || (prev.length === 2 && prev.startsWith("-"))) return "0";
      return prev.slice(0, -1);
    });
  }, [waitingForOperand]);

  const performOperation = useCallback(
    (nextOp: Op) => {
      const current = parseFloat(display);
      if (Number.isNaN(current)) return;
      if (previous === null) {
        setPrevious(current);
      } else if (operator && !waitingForOperand) {
        const result = compute(previous, current, operator);
        if (Number.isNaN(result) || !Number.isFinite(result)) {
          setDisplay("Erro");
          setPrevious(null);
          setOperator(null);
          setWaitingForOperand(true);
          setExpression("");
          return;
        }
        setPrevious(result);
        setDisplay(String(result));
      }
      setOperator(nextOp);
      setWaitingForOperand(true);
      const baseValue = previous === null || operator === null || waitingForOperand
        ? current
        : compute(previous, current, operator);
      setExpression(`${formatDisplay(String(baseValue))} ${nextOp}`);
    },
    [display, previous, operator, waitingForOperand],
  );

  const equals = useCallback(() => {
    const current = parseFloat(display);
    if (Number.isNaN(current) || operator === null || previous === null) return;
    const result = compute(previous, current, operator);
    if (Number.isNaN(result) || !Number.isFinite(result)) {
      setDisplay("Erro");
    } else {
      setDisplay(String(result));
    }
    setExpression("");
    setPrevious(null);
    setOperator(null);
    setWaitingForOperand(true);
  }, [display, operator, previous]);

  useEffect(() => {
    if (!open) return;
    clearAll();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key >= "0" && e.key <= "9") {
        inputDigit(e.key);
      } else if (e.key === "." || e.key === ",") {
        inputDot();
      } else if (e.key === "+" || e.key === "-" || e.key === "*" || e.key === "/") {
        performOperation(e.key as Op);
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        equals();
      } else if (e.key === "Backspace") {
        backspace();
      } else if (e.key === "%") {
        inputPercent();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const keyBase =
    "h-14 rounded-xl text-lg font-medium transition-colors active:scale-[0.97] select-none";
  const numKey = `${keyBase} bg-[#F1F5F9] text-[#1E293B] hover:bg-[#E2E8F0]`;
  const fnKey = `${keyBase} bg-[#E2E8F0] text-[#334155] hover:bg-[#CBD5E1]`;
  const opKey = `${keyBase} bg-[#0E7490] text-white hover:bg-[#0C6076]`;
  const eqKey = `${keyBase} bg-[#16A34A] text-white hover:bg-[#15803D]`;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-xs bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-semibold text-[#1E293B]">Calculadora</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="rounded-xl bg-[#0F172A] px-4 py-3 mb-3 text-right">
          <div className="h-5 text-[13px] text-[#94A3B8] truncate">{expression || "\u00A0"}</div>
          <div className="text-3xl font-semibold text-white truncate tabular-nums">
            {formatDisplay(display)}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button type="button" className={fnKey} onClick={clearAll}>
            C
          </button>
          <button type="button" className={fnKey} onClick={toggleSign}>
            +/−
          </button>
          <button type="button" className={fnKey} onClick={inputPercent}>
            %
          </button>
          <button type="button" className={opKey} onClick={() => performOperation("/")}>
            ÷
          </button>

          <button type="button" className={numKey} onClick={() => inputDigit("7")}>
            7
          </button>
          <button type="button" className={numKey} onClick={() => inputDigit("8")}>
            8
          </button>
          <button type="button" className={numKey} onClick={() => inputDigit("9")}>
            9
          </button>
          <button type="button" className={opKey} onClick={() => performOperation("*")}>
            ×
          </button>

          <button type="button" className={numKey} onClick={() => inputDigit("4")}>
            4
          </button>
          <button type="button" className={numKey} onClick={() => inputDigit("5")}>
            5
          </button>
          <button type="button" className={numKey} onClick={() => inputDigit("6")}>
            6
          </button>
          <button type="button" className={opKey} onClick={() => performOperation("-")}>
            −
          </button>

          <button type="button" className={numKey} onClick={() => inputDigit("1")}>
            1
          </button>
          <button type="button" className={numKey} onClick={() => inputDigit("2")}>
            2
          </button>
          <button type="button" className={numKey} onClick={() => inputDigit("3")}>
            3
          </button>
          <button type="button" className={opKey} onClick={() => performOperation("+")}>
            +
          </button>

          <button type="button" className={`${numKey} col-span-2`} onClick={() => inputDigit("0")}>
            0
          </button>
          <button type="button" className={numKey} onClick={inputDot}>
            ,
          </button>
          <button type="button" className={eqKey} onClick={equals}>
            =
          </button>
        </div>

        <button
          type="button"
          className="mt-2 h-10 w-full rounded-xl border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC]"
          onClick={backspace}
        >
          ← Apagar
        </button>
      </div>
    </div>,
    document.body,
  );
}
