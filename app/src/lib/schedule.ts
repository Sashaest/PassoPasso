import { addMinutes } from "./time";

/**
 * Calcolo (puro) degli orari dei promemoria insistenti.
 *
 * Invece di una notifica che si ripete all'infinito, programmiamo una serie finita
 * (es. 6 notifiche ogni 10 minuti). Così "Rimanda" e "Fatto" sono semplici da gestire
 * e il telefono non suona per sempre se l'app viene dimenticata.
 */
export function orariPromemoria(inizio: Date, intervalloMin: number, ripetizioni: number): Date[] {
  const n = Math.min(12, Math.max(1, Math.floor(ripetizioni)));
  const step = Math.max(1, intervalloMin);
  return Array.from({ length: n }, (_, i) => addMinutes(inizio, i * step));
}
