import type { ReactNode } from "react";
import OfficeNotificationPopup from "../components/OfficeNotificationPopup";
import { NotificationPollingProvider } from "../contexts/NotificationPollingContext";

/** Ativa polling de notificações (5 min) apenas nas rotas que precisam de alertas. */
export default function WithNotificationPolling({ children }: { children: ReactNode }) {
  return (
    <NotificationPollingProvider>
      {children}
      <OfficeNotificationPopup />
    </NotificationPollingProvider>
  );
}
