import { useEffect, useState } from "react";
import { Search, Bell, CalendarDays, LogOut } from "lucide-react";
import { useNavigate } from "react-router";
import { routes } from "../lib/routes";
import { useAuthStore } from "../stores/authStore";
import NavButton from "./NavButton";
import GlobalSearchDialog from "./GlobalSearchDialog";

export default function Topbar() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const [searchOpen, setSearchOpen] = useState(false);
  const name = session?.user?.name ?? "Usuario";
  const role = session?.role ?? "Administrador";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <>
      <header className="h-16 flex items-center justify-between px-6 gap-4">
        <div className="relative flex-1 max-w-[420px]">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
            strokeWidth={1.5}
          />
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="w-full h-10 pl-10 pr-20 bg-white border border-[#E2E8F0] rounded-lg text-[13px] text-left text-[#94A3B8] hover:border-[#0E7490]/40 transition-all"
          >
            Buscar cliente, veiculo, OS, placa...
          </button>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded pointer-events-none">
            CTRL + K
          </span>
        </div>

        <div className="flex items-center gap-1">
          <NavButton
            to={routes.configuracoes}
            className="relative flex items-center gap-2 h-10 px-3 rounded-lg hover:bg-white/60 transition-colors"
          >
            <Bell size={18} strokeWidth={1.5} className="text-[#64748B]" />
            <span className="text-[13px] font-medium text-[#64748B] hidden sm:inline">Notificacoes</span>
          </NavButton>

          <NavButton
            to={routes.agenda}
            className="flex items-center gap-2 h-10 px-3 rounded-lg hover:bg-white/60 transition-colors"
          >
            <CalendarDays size={18} strokeWidth={1.5} className="text-[#64748B]" />
            <span className="text-[13px] font-medium text-[#64748B] hidden sm:inline">Agenda</span>
          </NavButton>

          <div className="w-px h-6 bg-[#E2E8F0] mx-1" />

          <button
            type="button"
            onClick={handleLogout}
            title="Sair"
            className="flex items-center gap-3 h-10 pl-2 pr-2 rounded-lg hover:bg-white/60 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0E7490] to-[#155E75] flex items-center justify-center">
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-[12px] font-semibold text-[#1E293B] leading-tight">{name}</span>
              <span className="text-[10px] text-[#94A3B8] leading-tight capitalize">{role}</span>
            </div>
            <LogOut size={14} className="text-[#94A3B8]" strokeWidth={1.5} />
          </button>
        </div>
      </header>
      <GlobalSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
