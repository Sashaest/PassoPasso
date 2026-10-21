import { createHash } from "node:crypto";
import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

/** Limite giornaliero di richieste AI per dispositivo (piano gratuito). */
export interface QuotaStore {
  /** Consuma una richiesta. Restituisce quante ne restano oggi, oppure -1 se il limite è raggiunto. */
  consume(deviceId: string, day: string, limit: number): Promise<number>;
}

export interface WaitlistStore {
  /** Salva l'email; se c'è già non fa nulla. */
  add(email: string, consentAt: string, origin: string): Promise<void>;
}

/** L'id del dispositivo viene salvato solo come hash, mai in chiaro. */
export const hashDevice = (deviceId: string) =>
  createHash("sha256").update(`passo:${deviceId}`).digest("hex").slice(0, 32);

export function createDynamoStores(tableName: string, client = new DynamoDBClient({})) {
  const quota: QuotaStore = {
    async consume(deviceId, day, limit) {
      // il contatore si cancella da solo dopo 2 giorni (TTL di DynamoDB)
      const ttl = Math.floor(Date.now() / 1000) + 2 * 24 * 3600;
      try {
        const out = await client.send(
          new UpdateItemCommand({
            TableName: tableName,
            Key: { pk: { S: `quota#${hashDevice(deviceId)}` }, sk: { S: day } },
            UpdateExpression: "ADD #c :one SET #t = :ttl",
            ConditionExpression: "attribute_not_exists(#c) OR #c < :limit",
            ExpressionAttributeNames: { "#c": "count", "#t": "ttl" },
            ExpressionAttributeValues: {
              ":one": { N: "1" },
              ":limit": { N: String(limit) },
              ":ttl": { N: String(ttl) },
            },
            ReturnValues: "UPDATED_NEW",
          }),
        );
        const used = Number(out.Attributes?.count?.N ?? "1");
        return Math.max(0, limit - used);
      } catch (err) {
        if (err instanceof ConditionalCheckFailedException) return -1;
        throw err;
      }
    },
  };

  const waitlist: WaitlistStore = {
    async add(email, consentAt, origin) {
      try {
        await client.send(
          new PutItemCommand({
            TableName: tableName,
            Item: {
              pk: { S: "waitlist" },
              sk: { S: email },
              consentAt: { S: consentAt },
              origin: { S: origin },
            },
            ConditionExpression: "attribute_not_exists(pk)",
          }),
        );
      } catch (err) {
        if (err instanceof ConditionalCheckFailedException) return;
        throw err;
      }
    },
  };

  return { quota, waitlist };
}
