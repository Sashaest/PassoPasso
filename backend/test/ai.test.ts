import { describe, expect, it, vi } from "vitest";
import { AiError, createAiClient, normalizeBreakdown, normalizePriorities } from "../src/ai";

function fakeFetch(payload: unknown, status = 200) {
  return vi.fn(async () =>
    new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } }),
  ) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

const okMessage = (obj: unknown) => ({
  content: [
    { type: "thinking", thinking: "..." },
    { type: "text", text: JSON.stringify(obj) },
  ],
  stop_reason: "end_turn",
});

describe("createAiClient", () => {
  it("invia la richiesta con modello, header e formato JSON corretti", async () => {
    const fetchFn = fakeFetch(
      okMessage({ passi: [{ testo: "Apri la mail", minuti: 2 }], incoraggiamento: "Vai!" }),
    );
    const ai = createAiClient({ apiKey: async () => "sk-test", model: "claude-haiku-5-5", fetchFn });
    const out = await ai.breakdown({ compito: "Rispondere alla mail del commercialista" });

    expect(out.passi).toEqual([{ testo: "Apri la mail", minuti: 2 }]);
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-test");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("claude-haiku-5-5");
    expect(body.output_config.format.type).toBe("json_schema");
    expect(body.messages[0].content).toContain("<compito>Rispondere alla mail del commercialista</compito>");
  });

  it("segnala un errore se l'API risponde con un errore HTTP", async () => {
    const ai = createAiClient({
      apiKey: async () => "k",
      model: "m",
      fetchFn: fakeFetch({ error: "overloaded" }, 529),
    });
    await expect(ai.breakdown({ compito: "Fare la spesa" })).rejects.toBeInstanceOf(AiError);
  });

  it("segnala un errore se il modello rifiuta", async () => {
    const ai = createAiClient({
      apiKey: async () => "k",
      model: "m",
      fetchFn: fakeFetch({ content: [], stop_reason: "refusal" }),
    });
    await expect(ai.breakdown({ compito: "Fare la spesa" })).rejects.toThrow(/rifiutata/);
  });

  it("filtra le priorità con id inventati", async () => {
    const ai = createAiClient({
      apiKey: async () => "k",
      model: "m",
      fetchFn: fakeFetch(
        okMessage({
          priorita: [
            { id: "a", motivo: "Scade oggi" },
            { id: "inventato", motivo: "?" },
          ],
          messaggio: "Buona giornata",
        }),
      ),
    });
    const out = await ai.priorities({
      momento: "mattina",
      oggi: "2026-10-21",
      compiti: [
        { id: "a", titolo: "Pagare bolletta" },
        { id: "b", titolo: "Chiamare il medico" },
      ],
    });
    expect(out.priorita.map((p) => p.id)).toEqual(["a"]);
  });
});

describe("normalizeBreakdown", () => {
  it("limita minuti, lunghezza e numero di passi", () => {
    const out = normalizeBreakdown({
      passi: Array.from({ length: 10 }, (_, i) => ({ testo: `  passo ${i}  `, minuti: i === 0 ? 0 : 99 })),
      incoraggiamento: "x".repeat(300),
    });
    expect(out.passi).toHaveLength(7);
    expect(out.passi[0]).toEqual({ testo: "passo 0", minuti: 1 });
    expect(out.passi[1].minuti).toBe(15);
    expect(out.incoraggiamento.length).toBeLessThanOrEqual(100);
  });

  it("rifiuta una risposta senza passi validi", () => {
    expect(() => normalizeBreakdown({ passi: [{ testo: "   ", minuti: 3 }], incoraggiamento: "" })).toThrow(AiError);
  });
});

describe("normalizePriorities", () => {
  it("rimuove duplicati e tiene al massimo 3 priorità", () => {
    const out = normalizePriorities(
      {
        priorita: ["a", "a", "b", "c", "d"].map((id) => ({ id, motivo: "m" })),
        messaggio: "ok",
      },
      new Set(["a", "b", "c", "d"]),
    );
    expect(out.priorita.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });
});
