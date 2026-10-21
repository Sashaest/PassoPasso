import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import { AiError, type AiClient } from "../src/ai";
import { createHandler, romeDay, type HandlerDeps } from "../src/handler";

const DEVICE = "3f2b8a1e-7c4d-4e5f-9a6b-1c2d3e4f5a6b";

function event(routeKey: string, body?: unknown, headers: Record<string, string> = {}) {
  return {
    routeKey,
    headers: { "x-passo-device": DEVICE, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEventV2;
}

function setup(over: Partial<HandlerDeps> = {}) {
  const ai: AiClient = {
    breakdown: vi.fn(async () => ({ passi: [{ testo: "Apri", minuti: 2 }], incoraggiamento: "Vai" })),
    priorities: vi.fn(async () => ({ priorita: [], messaggio: "ok" })),
  };
  const quota = { consume: vi.fn(async () => 9) };
  const waitlist = { add: vi.fn(async () => {}) };
  const handler = createHandler({
    ai,
    quota,
    waitlist,
    dailyFreeLimit: 10,
    now: () => new Date("2026-10-21T22:30:00Z"),
    log: () => {},
    ...over,
  });
  return { handler, ai, quota, waitlist };
}

const parse = (r: { body?: string }) => JSON.parse(r.body ?? "{}");

describe("handler", () => {
  it("risponde alla verifica di salute", async () => {
    const { handler } = setup();
    const r = await handler(event("GET /v1/salute"));
    expect(r.statusCode).toBe(200);
  });

  it("spezza un compito e indica le richieste rimaste", async () => {
    const { handler, quota } = setup();
    const r = await handler(event("POST /v1/spezza", { compito: "Fare la dichiarazione dei redditi" }));
    expect(r.statusCode).toBe(200);
    expect(parse(r).passi).toHaveLength(1);
    expect(r.headers?.["x-passo-remaining"]).toBe("9");
    // 22:30 UTC del 21 ottobre è già il 22 ottobre in Italia
    expect(quota.consume).toHaveBeenCalledWith(DEVICE, "2026-10-22", 10);
  });

  it("rifiuta un compito vuoto senza consumare il limite", async () => {
    const { handler, quota } = setup();
    const r = await handler(event("POST /v1/spezza", { compito: " " }));
    expect(r.statusCode).toBe(400);
    expect(quota.consume).not.toHaveBeenCalled();
  });

  it("richiede un id dispositivo valido", async () => {
    const { handler } = setup();
    const r = await handler(event("POST /v1/spezza", { compito: "Lavatrice" }, { "x-passo-device": "abc" }));
    expect(r.statusCode).toBe(400);
  });

  it("controlla la chiave dell'app se configurata", async () => {
    const { handler } = setup({ appKey: "segreto" });
    const senza = await handler(event("POST /v1/spezza", { compito: "Lavatrice" }));
    expect(senza.statusCode).toBe(401);
    const con = await handler(event("POST /v1/spezza", { compito: "Lavatrice" }, { "x-passo-app-key": "segreto" }));
    expect(con.statusCode).toBe(200);
  });

  it("restituisce 429 con un messaggio gentile quando il limite è finito", async () => {
    const { handler, ai } = setup({ quota: { consume: async () => -1 } });
    const r = await handler(event("POST /v1/spezza", { compito: "Lavatrice" }));
    expect(r.statusCode).toBe(429);
    expect(parse(r).errore.codice).toBe("limite_giornaliero");
    expect(ai.breakdown).not.toHaveBeenCalled();
  });

  it("restituisce 502 se l'AI non risponde", async () => {
    const { handler } = setup({
      ai: {
        breakdown: async () => {
          throw new AiError("timeout");
        },
        priorities: async () => {
          throw new AiError("timeout");
        },
      },
    });
    const r = await handler(event("POST /v1/spezza", { compito: "Lavatrice" }));
    expect(r.statusCode).toBe(502);
  });

  it("valida la richiesta delle priorità", async () => {
    const { handler, ai } = setup();
    const bad = await handler(event("POST /v1/priorita", { momento: "notte", oggi: "2026-10-21", compiti: [] }));
    expect(bad.statusCode).toBe(400);
    const ok = await handler(
      event("POST /v1/priorita", {
        momento: "mattina",
        oggi: "2026-10-21",
        compiti: [{ id: "1", titolo: "Bolletta" }],
      }),
    );
    expect(ok.statusCode).toBe(200);
    expect(ai.priorities).toHaveBeenCalledOnce();
  });

  it("iscrive alla lista d'attesa solo con consenso e senza honeypot", async () => {
    const { handler, waitlist } = setup();
    const noConsenso = await handler(event("POST /v1/lista-attesa", { email: "a@b.it", consenso: false }));
    expect(noConsenso.statusCode).toBe(400);
    const bot = await handler(event("POST /v1/lista-attesa", { email: "a@b.it", consenso: true, sito: "spam" }));
    expect(bot.statusCode).toBe(400);
    const ok = await handler(event("POST /v1/lista-attesa", { email: " Mario@Esempio.IT ", consenso: true }));
    expect(ok.statusCode).toBe(200);
    expect(waitlist.add).toHaveBeenCalledWith("mario@esempio.it", expect.any(String), "sito");
  });

  it("risponde 404 alle rotte sconosciute", async () => {
    const { handler } = setup();
    expect((await handler(event("GET /admin"))).statusCode).toBe(404);
  });
});

describe("romeDay", () => {
  it("usa il fuso orario italiano", () => {
    expect(romeDay(new Date("2026-03-01T23:30:00Z"))).toBe("2026-03-02");
    expect(romeDay(new Date("2026-03-01T22:30:00Z"))).toBe("2026-03-01");
  });
});
