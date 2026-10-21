import {
  BREAKDOWN_SCHEMA,
  BREAKDOWN_SYSTEM,
  PRIORITIES_SCHEMA,
  PRIORITIES_SYSTEM,
  breakdownUserMessage,
  prioritiesUserMessage,
} from "./prompts";
import {
  breakdownResultSchema,
  prioritiesResultSchema,
  type BreakdownRequest,
  type BreakdownResult,
  type PrioritiesRequest,
  type PrioritiesResult,
} from "./validation";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

export class AiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "AiError";
  }
}

export interface AiClientOptions {
  apiKey: () => Promise<string>;
  model: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

interface CallArgs {
  system: string;
  user: string;
  schema: object;
  maxTokens: number;
}

export interface AiClient {
  breakdown(req: BreakdownRequest): Promise<BreakdownResult>;
  priorities(req: PrioritiesRequest): Promise<PrioritiesResult>;
}

export function createAiClient(opts: AiClientOptions): AiClient {
  const fetchFn = opts.fetchFn ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 25_000;

  async function call({ system, user, schema, maxTokens }: CallArgs): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetchFn(API_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": await opts.apiKey(),
          "anthropic-version": API_VERSION,
        },
        body: JSON.stringify({
          model: opts.model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: user }],
          output_config: { format: { type: "json_schema", schema } },
        }),
      });
    } catch (err) {
      throw new AiError(controller.signal.aborted ? "timeout AI" : `rete AI: ${String(err)}`);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new AiError(`AI ha risposto ${res.status}: ${body.slice(0, 300)}`, res.status);
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
      stop_reason?: string;
    };
    if (data.stop_reason === "refusal") throw new AiError("richiesta rifiutata dal modello");
    const text = data.content?.find((b) => b.type === "text")?.text;
    if (!text) throw new AiError("risposta AI vuota");
    try {
      return JSON.parse(text);
    } catch {
      throw new AiError("risposta AI non è JSON valido");
    }
  }

  return {
    async breakdown(req) {
      const raw = await call({
        system: BREAKDOWN_SYSTEM,
        user: breakdownUserMessage(req.compito, req.dettagli),
        schema: BREAKDOWN_SCHEMA,
        maxTokens: 2_000,
      });
      const parsed = breakdownResultSchema.safeParse(raw);
      if (!parsed.success) throw new AiError("formato spezza-compiti inatteso");
      return normalizeBreakdown(parsed.data);
    },

    async priorities(req) {
      const raw = await call({
        system: PRIORITIES_SYSTEM,
        user: prioritiesUserMessage(req.compiti, req.momento, req.oggi),
        schema: PRIORITIES_SCHEMA,
        maxTokens: 1_500,
      });
      const parsed = prioritiesResultSchema.safeParse(raw);
      if (!parsed.success) throw new AiError("formato priorità inatteso");
      return normalizePriorities(parsed.data, new Set(req.compiti.map((c) => c.id)));
    },
  };
}

const clip = (s: string, max: number) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};

/** Le regole che lo schema JSON non può imporre (lunghezze, intervalli) le applichiamo qui. */
export function normalizeBreakdown(r: BreakdownResult): BreakdownResult {
  const passi = r.passi
    .map((p) => ({
      testo: clip(p.testo, 120),
      minuti: Math.min(15, Math.max(1, Math.round(Number.isFinite(p.minuti) ? p.minuti : 5))),
    }))
    .filter((p) => p.testo.length > 0)
    .slice(0, 7);
  if (passi.length === 0) throw new AiError("nessun passo valido");
  return { passi, incoraggiamento: clip(r.incoraggiamento, 100) };
}

export function normalizePriorities(r: PrioritiesResult, validIds: Set<string>): PrioritiesResult {
  const seen = new Set<string>();
  const priorita = r.priorita
    .filter((p) => validIds.has(p.id) && !seen.has(p.id) && seen.add(p.id))
    .slice(0, 3)
    .map((p) => ({ id: p.id, motivo: clip(p.motivo, 80) }));
  return { priorita, messaggio: clip(r.messaggio, 120) };
}
