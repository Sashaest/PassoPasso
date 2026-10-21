import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { createAiClient } from "./ai";
import { createHandler } from "./handler";
import { createDynamoStores } from "./store";

/** Punto d'ingresso della Lambda: legge la configurazione dalle variabili d'ambiente (vedi template.yaml). */

const env = (name: string, fallback?: string): string => {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Variabile d'ambiente mancante: ${name}`);
  return v;
};

const ssm = new SSMClient({});
let cachedKey: Promise<string> | undefined;

/** La chiave dell'API AI sta in SSM Parameter Store (SecureString) e viene letta una volta per container. */
function apiKey(): Promise<string> {
  cachedKey ??= ssm
    .send(new GetParameterCommand({ Name: env("ANTHROPIC_KEY_PARAM"), WithDecryption: true }))
    .then((out) => {
      const v = out.Parameter?.Value;
      if (!v) throw new Error("Chiave AI vuota in SSM");
      return v;
    })
    .catch((err) => {
      cachedKey = undefined;
      throw err;
    });
  return cachedKey;
}

const stores = createDynamoStores(env("TABLE_NAME"));

export const handler = createHandler({
  ai: createAiClient({ apiKey, model: env("AI_MODEL", "claude-haiku-5-5") }),
  quota: stores.quota,
  waitlist: stores.waitlist,
  dailyFreeLimit: Number(env("DAILY_FREE_LIMIT", "10")),
  appKey: process.env.APP_KEY || undefined,
});
