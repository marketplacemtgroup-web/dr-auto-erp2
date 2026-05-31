const REQUEST_TIMEOUT_MS = 15_000;

export class RequestTimeoutError extends Error {
  constructor() {
    super("A API demorou demais para responder. Verifique se o servidor está ligado.");
    this.name = "RequestTimeoutError";
  }
}

/** fetch com timeout para não travar a UI em "Carregando..." */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  const extSignal = init?.signal;
  if (extSignal) {
    if (extSignal.aborted) ctrl.abort();
    else extSignal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new RequestTimeoutError();
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function parseJsonBody<T>(
  res: Response,
  opts?: { allowEmpty?: boolean },
): Promise<T> {
  if (res.status === 204) {
    if (opts?.allowEmpty) return null as T;
    throw new Error("Resposta vazia do servidor");
  }
  const text = await res.text();
  if (!text.trim()) {
    if (opts?.allowEmpty) return null as T;
    throw new Error("Resposta vazia do servidor");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Resposta inválida do servidor");
  }
}
