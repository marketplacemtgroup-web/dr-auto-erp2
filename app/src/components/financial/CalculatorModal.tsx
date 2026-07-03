import { useEffect, useReducer } from "react";
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

// Converte numero para string limitando artefatos de ponto flutuante (ex.: 0.1 + 0.2).
function toNumStr(n: number): string {
  if (!Number.isFinite(n)) return "Erro";
  const rounded = Math.round((n + Number.EPSILON) * 1e10) / 1e10;
  return String(rounded);
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

type State = {
  display: string;
  previous: number | null;
  operator: Op | null;
  waitingForOperand: boolean;
  expression: string;
};

const initialState: State = {
  display: "0",
  previous: null,
  operator: null,
  waitingForOperand: false,
  expression: "",
};

type Action =
  | { type: "digit"; digit: string }
  | { type: "dot" }
  | { type: "clear" }
  | { type: "toggleSign" }
  | { type: "percent" }
  | { type: "backspace" }
  | { type: "operator"; op: Op }
  | { type: "equals" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "clear":
      return initialState;

    case "digit": {
      const { digit } = action;
      if (state.display === "Erro") {
        return { ...initialState, display: digit };
      }
      if (state.waitingForOperand) {
        return { ...state, display: digit, waitingForOperand: false };
      }
      if (state.display === "0") {
        return { ...state, display: digit };
      }
      if (state.display.replace(/[^\d]/g, "").length >= 15) {
        return state;
      }
      return { ...state, display: state.display + digit };
    }

    case "dot": {
      if (state.display === "Erro") {
        return { ...initialState, display: "0." };
      }
      if (state.waitingForOperand) {
        return { ...state, display: "0.", waitingForOperand: false };
      }
      if (state.display.includes(".")) return state;
      return { ...state, display: state.display + "." };
    }

    case "toggleSign": {
      if (state.display === "0" || state.display === "Erro") return state;
      const next = state.display.startsWith("-")
        ? state.display.slice(1)
        : "-" + state.display;
      return { ...state, display: next };
    }

    case "percent": {
      if (state.display === "Erro") return state;
      const current = parseFloat(state.display);
      if (Number.isNaN(current)) return state;
      let result: number;
      if (state.previous !== null && state.operator) {
        result =
          state.operator === "+" || state.operator === "-"
            ? (state.previous * current) / 100
            : current / 100;
      } else {
        result = current / 100;
      }
      return { ...state, display: toNumStr(result), waitingForOperand: false };
    }

    case "backspace": {
      if (state.display === "Erro" || state.waitingForOperand) return state;
      const d = state.display;
      if (d.length <= 1 || (d.length === 2 && d.startsWith("-"))) {
        return { ...state, display: "0" };
      }
      return { ...state, display: d.slice(0, -1) };
    }

    case "operator": {
      const { op } = action;
      const current = parseFloat(state.display);
      if (Number.isNaN(current)) return state;

      // Trocar de operador sem digitar novo numero: apenas atualiza o operador.
      if (state.waitingForOperand && state.previous !== null) {
        return {
          ...state,
          operator: op,
          expression: `${formatDisplay(toNumStr(state.previous))} ${op}`,
        };
      }

      let newPrevious: number;
      if (state.previous === null) {
        newPrevious = current;
      } else if (state.operator) {
        const result = compute(state.previous, current, state.operator);
        if (!Number.isFinite(result)) {
          return { ...initialState, display: "Erro", waitingForOperand: true };
        }
        newPrevious = Number(toNumStr(result));
      } else {
        newPrevious = current;
      }

      return {
        ...state,
        previous: newPrevious,
        display: toNumStr(newPrevious),
        operator: op,
        waitingForOperand: true,
        expression: `${formatDisplay(toNumStr(newPrevious))} ${op}`,
      };
    }

    case "equals": {
      if (state.operator === null || state.previous === null) return state;
      const current = parseFloat(state.display);
      if (Number.isNaN(current)) return state;
      const result = compute(state.previous, current, state.operator);
      if (!Number.isFinite(result)) {
        return { ...initialState, display: "Erro", waitingForOperand: true };
      }
      return {
        ...initialState,
        display: toNumStr(result),
        waitingForOperand: true,
      };
    }

    default:
      return state;
  }
}

export default function CalculatorModal({ open, onClose }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { display, expression } = state;

  useEffect(() => {
    if (!open) return;
    dispatch({ type: "clear" });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key >= "0" && e.key <= "9") {
        dispatch({ type: "digit", digit: e.key });
      } else if (e.key === "." || e.key === ",") {
        dispatch({ type: "dot" });
      } else if (e.key === "+" || e.key === "-" || e.key === "*" || e.key === "/") {
        dispatch({ type: "operator", op: e.key as Op });
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        dispatch({ type: "equals" });
      } else if (e.key === "Backspace") {
        dispatch({ type: "backspace" });
      } else if (e.key === "%") {
        dispatch({ type: "percent" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

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
          <button type="button" className={fnKey} onClick={() => dispatch({ type: "clear" })}>
            C
          </button>
          <button type="button" className={fnKey} onClick={() => dispatch({ type: "toggleSign" })}>
            +/−
          </button>
          <button type="button" className={fnKey} onClick={() => dispatch({ type: "percent" })}>
            %
          </button>
          <button type="button" className={opKey} onClick={() => dispatch({ type: "operator", op: "/" })}>
            ÷
          </button>

          <button type="button" className={numKey} onClick={() => dispatch({ type: "digit", digit: "7" })}>
            7
          </button>
          <button type="button" className={numKey} onClick={() => dispatch({ type: "digit", digit: "8" })}>
            8
          </button>
          <button type="button" className={numKey} onClick={() => dispatch({ type: "digit", digit: "9" })}>
            9
          </button>
          <button type="button" className={opKey} onClick={() => dispatch({ type: "operator", op: "*" })}>
            ×
          </button>

          <button type="button" className={numKey} onClick={() => dispatch({ type: "digit", digit: "4" })}>
            4
          </button>
          <button type="button" className={numKey} onClick={() => dispatch({ type: "digit", digit: "5" })}>
            5
          </button>
          <button type="button" className={numKey} onClick={() => dispatch({ type: "digit", digit: "6" })}>
            6
          </button>
          <button type="button" className={opKey} onClick={() => dispatch({ type: "operator", op: "-" })}>
            −
          </button>

          <button type="button" className={numKey} onClick={() => dispatch({ type: "digit", digit: "1" })}>
            1
          </button>
          <button type="button" className={numKey} onClick={() => dispatch({ type: "digit", digit: "2" })}>
            2
          </button>
          <button type="button" className={numKey} onClick={() => dispatch({ type: "digit", digit: "3" })}>
            3
          </button>
          <button type="button" className={opKey} onClick={() => dispatch({ type: "operator", op: "+" })}>
            +
          </button>

          <button type="button" className={`${numKey} col-span-2`} onClick={() => dispatch({ type: "digit", digit: "0" })}>
            0
          </button>
          <button type="button" className={numKey} onClick={() => dispatch({ type: "dot" })}>
            ,
          </button>
          <button type="button" className={eqKey} onClick={() => dispatch({ type: "equals" })}>
            =
          </button>
        </div>

        <button
          type="button"
          className="mt-2 h-10 w-full rounded-xl border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC]"
          onClick={() => dispatch({ type: "backspace" })}
        >
          ← Apagar
        </button>
      </div>
    </div>,
    document.body,
  );
}
