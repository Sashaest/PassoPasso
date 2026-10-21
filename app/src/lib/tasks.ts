import type { Compito, Passo } from "./types";
import { dayKey } from "./time";

/**
 * Funzioni pure sui compiti: niente stato, niente effetti.
 * Lo store (lib/store.ts) le usa; i test (src/__tests__) le verificano.
 */

export function nuovoCompito(id: string, titolo: string, now: Date, scadenza?: string): Compito {
  return {
    id,
    titolo: titolo.trim().replace(/\s+/g, " ").slice(0, 300),
    creatoIl: now.toISOString(),
    scadenza,
    passi: [],
    fatto: false,
  };
}

export function nuovoPasso(id: string, testo: string, minuti = 5): Passo {
  return { id, testo: testo.trim().slice(0, 160), minuti: Math.min(60, Math.max(1, Math.round(minuti))), fatto: false };
}

/** Divide un testo dettato o scritto in più compiti: una riga = un compito. */
export function dividiInCompiti(testo: string): string[] {
  return testo
    .split(/\r?\n|;|•/)
    .map((r) => r.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter((r) => r.length >= 2)
    .slice(0, 20);
}

export function primoPassoAperto(c: Compito): Passo | undefined {
  return c.passi.find((p) => !p.fatto);
}

export function progresso(c: Compito): { fatti: number; totale: number } {
  return { fatti: c.passi.filter((p) => p.fatto).length, totale: c.passi.length };
}

/** Segna un passo fatto o non fatto. Quando tutti i passi sono fatti, il compito è fatto. */
export function alternaPasso(c: Compito, passoId: string, now: Date): Compito {
  const passi = c.passi.map((p) => (p.id === passoId ? { ...p, fatto: !p.fatto } : p));
  const tuttiFatti = passi.length > 0 && passi.every((p) => p.fatto);
  return {
    ...c,
    passi,
    fatto: tuttiFatti,
    fattoIl: tuttiFatti ? (c.fattoIl ?? now.toISOString()) : undefined,
  };
}

export function completa(c: Compito, now: Date): Compito {
  return {
    ...c,
    fatto: true,
    fattoIl: now.toISOString(),
    passi: c.passi.map((p) => ({ ...p, fatto: true })),
    promemoria: undefined,
  };
}

export function riapri(c: Compito): Compito {
  return { ...c, fatto: false, fattoIl: undefined };
}

export function nonOggi(c: Compito, now: Date): Compito {
  return { ...c, nonOggi: dayKey(now), promemoria: undefined };
}

/** Compiti da mostrare oggi: aperti, non rimandati a domani. Prima quelli con scadenza vicina. */
export function compitiDiOggi(compiti: Compito[], now: Date): Compito[] {
  const oggi = dayKey(now);
  return compiti
    .filter((c) => !c.fatto && c.nonOggi !== oggi)
    .sort((a, b) => {
      const sa = a.scadenza ?? "9999-12-31";
      const sb = b.scadenza ?? "9999-12-31";
      if (sa !== sb) return sa < sb ? -1 : 1;
      return a.creatoIl < b.creatoIl ? -1 : 1;
    });
}

export function fattiOggi(compiti: Compito[], now: Date): Compito[] {
  const oggi = dayKey(now);
  return compiti.filter((c) => c.fatto && c.fattoIl && dayKey(new Date(c.fattoIl)) === oggi);
}

export function rimandatiAdomani(compiti: Compito[], now: Date): Compito[] {
  const oggi = dayKey(now);
  return compiti.filter((c) => !c.fatto && c.nonOggi === oggi);
}

/** Toglie i compiti fatti da più di 30 giorni, per non far crescere i dati all'infinito. */
export function pulisciVecchi(compiti: Compito[], now: Date): Compito[] {
  const limite = now.getTime() - 30 * 24 * 3600_000;
  return compiti.filter((c) => !c.fatto || !c.fattoIl || new Date(c.fattoIl).getTime() > limite);
}

/**
 * Scelta delle priorità senza AI (quando l'AI è spenta o non raggiungibile):
 * prima le scadenze, poi i compiti più vecchi. Massimo 3.
 */
export function prioritaSenzaAi(compiti: Compito[], now: Date): string[] {
  return compitiDiOggi(compiti, now)
    .slice(0, 3)
    .map((c) => c.id);
}
