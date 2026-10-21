import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import type { ZodSchema } from "zod";
import { AiError, type AiClient } from "./ai";
import type { QuotaStore, WaitlistStore } from "./store";
import {
  breakdownRequestSchema,
  deviceIdSchema,
  prioritiesRequestSchema,
  waitlistRequestSchema,
} from "./validation";

export interface HandlerDeps {
  ai: AiClient;
  quota: QuotaStore;
  waitlist: WaitlistStore;
  dailyFreeLimit: number;
  /** Chiave condivisa con l'app. NON è un segreto forte: è un deterrente. Vedi docs/ARCHITETTURA.md. */
  appKey?: string;
  now?: () => Date;
  log?: (msg: string, extra?: Record<string, unknown>) => void;
}

type Result = APIGatewayProxyStructuredResultV2;

const json = (statusCode: number, body: unknown, headers: Record<string, string> = {}): Result => ({
  statusCode,
  headers: { "content-type": "application/json; charset=utf-8", ...headers },
  body: JSON.stringify(body),
});

const errore = (statusCode: number, codice: string, messaggio: string) =>
  json(statusCode, { errore: { codice, messaggio } });

/** Data di oggi (YYYY-MM-DD) secondo l'ora italiana: il limite si azzera a mezzanotte in Italia. */
export function romeDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function parseBody<T>(event: APIGatewayProxyEventV2, schema: ZodSchema<T>): T | null {
  if (!event.body) return null;
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function createHandler(deps: HandlerDeps) {
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? ((msg, extra) => console.log(JSON.stringify({ msg, ...extra })));

  /** Controlli comuni agli endpoint AI: chiave app, id dispositivo, limite giornaliero. */
  async function guardAi(event: APIGatewayProxyEventV2): Promise<Result | { remaining: number }> {
    const h = event.headers ?? {};
    if (deps.appKey && h["x-passo-app-key"] !== deps.appKey) {
      return errore(401, "app_non_autorizzata", "Aggiorna l'app all'ultima versione.");
    }
    const device = deviceIdSchema.safeParse(h["x-passo-device"]);
    if (!device.success) return errore(400, "dispositivo_mancante", "Richiesta non valida.");
    const remaining = await deps.quota.consume(device.data, romeDay(now()), deps.dailyFreeLimit);
    if (remaining < 0) {
      return errore(
        429,
        "limite_giornaliero",
        "Per oggi hai usato tutti gli aiuti AI gratuiti. Puoi sempre spezzare i compiti a mano: domani si riparte.",
      );
    }
    return { remaining };
  }

  async function withAi(fn: () => Promise<unknown>, remaining: number): Promise<Result> {
    try {
      return json(200, await fn(), { "x-passo-remaining": String(remaining) });
    } catch (err) {
      log("ai_error", { error: String(err), status: err instanceof AiError ? err.status : undefined });
      return errore(502, "ai_non_disponibile", "L'assistente non risponde in questo momento. Riprova tra poco.");
    }
  }

  return async function handler(event: APIGatewayProxyEventV2): Promise<Result> {
    try {
      switch (event.routeKey) {
        case "GET /v1/salute":
          return json(200, { ok: true });

        case "POST /v1/spezza": {
          const body = parseBody(event, breakdownRequestSchema);
          if (!body) return errore(400, "richiesta_non_valida", "Scrivi il compito in poche parole (max 300 caratteri).");
          const g = await guardAi(event);
          if (!("remaining" in g)) return g;
          return withAi(() => deps.ai.breakdown(body), g.remaining);
        }

        case "POST /v1/priorita": {
          const body = parseBody(event, prioritiesRequestSchema);
          if (!body) return errore(400, "richiesta_non_valida", "Elenco dei compiti non valido.");
          const g = await guardAi(event);
          if (!("remaining" in g)) return g;
          return withAi(() => deps.ai.priorities(body), g.remaining);
        }

        case "POST /v1/lista-attesa": {
          const body = parseBody(event, waitlistRequestSchema);
          if (!body) return errore(400, "richiesta_non_valida", "Controlla l'email e accetta l'informativa.");
          await deps.waitlist.add(body.email, now().toISOString(), body.origine ?? "sito");
          return json(200, { ok: true });
        }

        default:
          return errore(404, "non_trovato", "Endpoint inesistente.");
      }
    } catch (err) {
      log("unhandled_error", { error: String(err), route: event.routeKey });
      return errore(500, "errore_interno", "Qualcosa è andato storto. Riprova tra poco.");
    }
  };
}
