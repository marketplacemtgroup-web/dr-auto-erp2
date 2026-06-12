import { Moon, Sun } from "lucide-react";
import { usePortalTheme } from "../../hooks/usePortalTheme";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { isLight, toggleTheme } = usePortalTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium portal-card ${className}`}
      aria-label={isLight ? "Ativar modo escuro" : "Ativar modo claro"}
    >
      {isLight ? <Moon size={16} /> : <Sun size={16} />}
      {isLight ? "Modo escuro" : "Modo claro"}
    </button>
  );
}
