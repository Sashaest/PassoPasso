/**
 * Microcopy dell'app. Tono: caldo, breve, mai giudicante.
 * Da far rivedere alla specialista (vedi docs/CONTENUTI.md).
 */

const scegli = <T,>(lista: readonly T[], seme = Date.now()): T => lista[Math.abs(seme) % lista.length];

export const COMPLIMENTI = [
  "Fatto. Questo conta.",
  "Un passo in meno. Bel lavoro.",
  "Ecco, l'hai fatto.",
  "Uno alla volta: funziona.",
  "Fatto! Respira un attimo.",
] as const;

export const RIPARTENZE = [
  "Si riparte da adesso. Niente da recuperare.",
  "Ieri è ieri. Oggi basta un passo.",
  "Nessuna serie da salvare: solo il prossimo passo.",
] as const;

export const PROMEMORIA_CORPI = [
  "Basta il primo passo: {passo}",
  "Ci sei? Il primo passo è piccolo: {passo}",
  "Due minuti, non di più: {passo}",
  "Sono ancora qui. Quando vuoi: {passo}",
] as const;

export const complimento = (seme?: number) => scegli(COMPLIMENTI, seme);
export const ripartenza = (seme?: number) => scegli(RIPARTENZE, seme);

export function corpoPromemoria(indice: number, primoPasso?: string): string {
  const passo = primoPasso ?? "apri il compito e guarda solo la prima cosa da fare";
  return PROMEMORIA_CORPI[indice % PROMEMORIA_CORPI.length].replace("{passo}", passo);
}

export const DISCLAIMER =
  "Passo è uno strumento di organizzazione: non fa diagnosi e non sostituisce il parere di un professionista sanitario.";
