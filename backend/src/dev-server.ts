/**
 * Server locale per provare app e sito senza AWS.
 *
 *   npm run dev                         -> AI finta (risposte di esempio, nessun costo)
 *   ANTHROPIC_API_KEY=... npm run dev   -> AI vera
 *
 * Ascolta su http://localhost:8787 (PORT per cambiarla). Dati in memoria.
 */
import { createServer } from "node:http";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { createAiClient, type AiClient } from "./ai";
import { createHandler } from "./handler";
import type { QuotaStore, WaitlistStore } from "./store";

const counts = new Map<string, number>();
const quota: QuotaStore = {
  async consume(device, day, limit) {
    const k = `${device}:${day}`;
    const used = counts.get(k) ?? 0;
    if (used >= limit) return -1;
    counts.set(k, used + 1);
    return limit - used - 1;
  },
};

const emails = new Set<string>();
const waitlist: WaitlistStore = {
  async add(email) {
    emails.add(email);
    console.log(`[lista d'attesa] ${email} (totale ${emails.size})`);
  },
};

const fakeAi: AiClient = {
  async breakdown(req) {
    return {
      passi: [
        { testo: `Metti davanti a te ciò che serve per: ${req.compito.slice(0, 60)}`, minuti: 2 },
        { testo: "Fai solo la prima parte, la più piccola", minuti: 5 },
        { testo: "Continua con la parte successiva", minuti: 10 },
        { testo: "Controlla e chiudi", minuti: 5 },
      ],
      incoraggiamento: "Inizia dal primo passo: due minuti e sei partito.",
    };
  },
  async priorities(req) {
    return {
      priorita: req.compiti.slice(0, 3).map((c) => ({
        id: c.id,
        motivo: c.scadenza === req.oggi ? "Scade oggi" : c.scadenza ? `Scade il ${c.scadenza}` : "Un passo alla volta",
      })),
      messaggio: "Tre cose bastano. Una alla volta.",
    };
  },
};

const key = process.env.ANTHROPIC_API_KEY;
const ai = key
  ? createAiClient({ apiKey: async () => key, model: process.env.AI_MODEL ?? "claude-haiku-5-5" })
  : fakeAi;

const handler = createHandler({
  ai,
  quota,
  waitlist,
  dailyFreeLimit: Number(process.env.DAILY_FREE_LIMIT ?? 50),
});

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,x-passo-device,x-passo-app-key",
  "access-control-expose-headers": "x-passo-remaining",
};

const port = Number(process.env.PORT ?? 8787);
createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, cors).end();
    return;
  }
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const path = (req.url ?? "/").split("?")[0];
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers[k] = v;
  const out = await handler({
    routeKey: `${req.method} ${path}`,
    headers,
    body: chunks.length ? Buffer.concat(chunks).toString("utf8") : undefined,
    isBase64Encoded: false,
  } as APIGatewayProxyEventV2);
  res.writeHead(out.statusCode ?? 200, { ...cors, ...(out.headers as Record<string, string>) });
  res.end(out.body);
}).listen(port, () => {
  console.log(`Passo API locale su http://localhost:${port} — AI ${key ? "vera" : "finta"}`);
});
