/**
 * Client del backend AI (backend/). L'URL arriva da EXPO_PUBLIC_API_URL al momento della build.
 * L'app funziona anche senza backend: ogni chiamata ha una strada di riserva senza AI.
 */

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
const APP_KEY = process.env.EXPO_PUBLIC_APP_KEY ?? "";

export type ErroreApi = {
  tipo: "non_configurato" | "rete" | "limite" | "server" | "richiesta";
  messaggio: string;
};

export type Esito<T> = { ok: true; dati: T; rimaste?: number } | { ok: false; errore: ErroreApi };

export type RispostaSpezza = { passi: { testo: string; minuti: number }[]; incoraggiamento: string };
export type RispostaPriorita = { priorita: { id: string; motivo: string }[]; messaggio: string };

async function post<T>(
  path: string,
  body: unknown,
  deviceId: string,
  fetchFn: typeof fetch = fetch,
): Promise<Esito<T>> {
  if (!API_URL) {
    return { ok: false, errore: { tipo: "non_configurato", messaggio: "Assistente AI non ancora attivo." } };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetchFn(`${API_URL}${path}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-passo-device": deviceId,
        ...(APP_KEY ? { "x-passo-app-key": APP_KEY } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { errore?: { messaggio?: string } } & T;
    if (res.ok) {
      const rimaste = Number(res.headers.get("x-passo-remaining"));
      return { ok: true, dati: data, rimaste: Number.isFinite(rimaste) ? rimaste : undefined };
    }
    const messaggio = data.errore?.messaggio ?? "L'assistente non risponde in questo momento.";
    const tipo = res.status === 429 ? "limite" : res.status >= 500 ? "server" : "richiesta";
    return { ok: false, errore: { tipo, messaggio } };
  } catch {
    return {
      ok: false,
      errore: { tipo: "rete", messaggio: "Sembra che tu sia offline. Ho preparato dei passi di base." },
    };
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  spezza: (deviceId: string, compito: string, fetchFn?: typeof fetch) =>
    post<RispostaSpezza>("/v1/spezza", { compito: compito.slice(0, 300) }, deviceId, fetchFn),

  priorita: (
    deviceId: string,
    body: {
      momento: "mattina" | "sera";
      oggi: string;
      compiti: { id: string; titolo: string; scadenza?: string }[];
    },
    fetchFn?: typeof fetch,
  ) =>
    post<RispostaPriorita>(
      "/v1/priorita",
      { ...body, compiti: body.compiti.slice(0, 40).map((c) => ({ ...c, titolo: c.titolo.slice(0, 300) })) },
      deviceId,
      fetchFn,
    ),
};
