import { api } from "./api";

export async function markQuoteNotificationsRead(token: string, quoteId: string) {
  try {
    const rows = await api.notificationsUnread(token);
    await Promise.all(
      rows
        .filter((r) => r.metadata?.quoteId === quoteId)
        .map((r) => api.notificationMarkRead(token, r.id)),
    );
  } catch {
    /* API indisponível — popup pode repetir no próximo poll */
  }
}
