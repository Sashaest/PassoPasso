const DEVICE = "3f2b8a1e-7c4d-4e5f-9a6b-1c2d3e4f5a6b";

function caricaApi(url: string) {
  process.env.EXPO_PUBLIC_API_URL = url;
  let mod!: typeof import("../lib/api");
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require("../lib/api");
  });
  return mod.api;
}

const risposta = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  jest.fn(async () => new Response(JSON.stringify(body), { status, headers })) as unknown as typeof fetch;

describe("client API", () => {
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  it("senza URL configurato non chiama la rete", async () => {
    const api = caricaApi("");
    const f = risposta(200, {});
    const r = await api.spezza(DEVICE, "Lavatrice", f);
    expect(r.ok).toBe(false);
    expect(f).not.toHaveBeenCalled();
    if (!r.ok) expect(r.errore.tipo).toBe("non_configurato");
  });

  it("restituisce i passi e quanti aiuti restano", async () => {
    const api = caricaApi("https://api.esempio.it/prod/");
    const f = risposta(
      200,
      { passi: [{ testo: "Apri", minuti: 2 }], incoraggiamento: "Vai" },
      { "x-passo-remaining": "7" },
    );
    const r = await api.spezza(DEVICE, "Lavatrice", f);
    expect(r).toEqual({ ok: true, dati: { passi: [{ testo: "Apri", minuti: 2 }], incoraggiamento: "Vai" }, rimaste: 7 });
    const [url, init] = (f as unknown as jest.Mock).mock.calls[0];
    expect(url).toBe("https://api.esempio.it/prod/v1/spezza");
    expect(init.headers["x-passo-device"]).toBe(DEVICE);
  });

  it("riconosce il limite giornaliero", async () => {
    const api = caricaApi("https://api.esempio.it");
    const r = await api.spezza(
      DEVICE,
      "Lavatrice",
      risposta(429, { errore: { codice: "limite_giornaliero", messaggio: "Finiti per oggi" } }),
    );
    expect(r).toEqual({ ok: false, errore: { tipo: "limite", messaggio: "Finiti per oggi" } });
  });

  it("gestisce l'assenza di rete", async () => {
    const api = caricaApi("https://api.esempio.it");
    const f = jest.fn(async () => {
      throw new TypeError("Network request failed");
    }) as unknown as typeof fetch;
    const r = await api.priorita(DEVICE, { momento: "mattina", oggi: "2026-10-21", compiti: [{ id: "a", titolo: "A" }] }, f);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errore.tipo).toBe("rete");
  });
});
