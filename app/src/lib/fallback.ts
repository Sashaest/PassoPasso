/**
 * Spezza-compiti di riserva, senza AI: usato quando l'utente ha spento l'AI,
 * quando manca la rete o quando il limite giornaliero è finito.
 * Il metodo è lo stesso dell'AI (vedi docs/CONTENUTI.md): primo passo minuscolo,
 * poi blocchi brevi, poi chiusura.
 */
export function spezzaSenzaAi(titolo: string): { testo: string; minuti: number }[] {
  const t = titolo.trim().replace(/[.!]+$/, "");
  return [
    { testo: `Prepara ciò che ti serve per "${t}" e mettilo davanti a te`, minuti: 2 },
    { testo: "Fai la parte più piccola e facile, solo quella", minuti: 5 },
    { testo: "Continua per un blocco breve, poi fermati e respira", minuti: 10 },
    { testo: "Controlla cosa manca e chiudi quello che puoi", minuti: 5 },
  ];
}
