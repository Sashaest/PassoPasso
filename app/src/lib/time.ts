const pad = (n: number) => String(n).padStart(2, "0");

/** Giorno locale del dispositivo in formato YYYY-MM-DD. */
export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60_000);
}

export function formatOra(ora: number, minuto: number): string {
  return `${pad(ora)}:${pad(minuto)}`;
}

/** "Buongiorno" / "Buon pomeriggio" / "Buonasera" */
export function saluto(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 5) return "Ciao";
  if (h < 13) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  return "Buonasera";
}

export function momentoDelGiorno(d: Date = new Date()): "mattina" | "sera" {
  return d.getHours() < 15 ? "mattina" : "sera";
}

/** Descrizione breve di una scadenza rispetto a oggi. */
export function etichettaScadenza(scadenza: string, oggi: Date = new Date()): string {
  const today = dayKey(oggi);
  if (scadenza < today) return "In ritardo, ma si può fare";
  if (scadenza === today) return "Oggi";
  if (scadenza === dayKey(addDays(oggi, 1))) return "Domani";
  const [y, m, d] = scadenza.split("-").map(Number);
  return `Entro il ${d}/${m}${y !== oggi.getFullYear() ? `/${y}` : ""}`;
}

/** Secondi in mm:ss */
export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}
