import { spezzaSenzaAi } from "../lib/fallback";
import { orariPromemoria } from "../lib/schedule";
import * as T from "../lib/tasks";
import { dayKey, etichettaScadenza, formatTimer } from "../lib/time";

const NOW = new Date(2026, 9, 21, 10, 0, 0); // 21 ottobre 2026, 10:00 ora locale

function compitoConPassi(n: number) {
  const c = T.nuovoCompito("c1", "Dichiarazione dei redditi", NOW);
  return { ...c, passi: Array.from({ length: n }, (_, i) => T.nuovoPasso(`p${i}`, `Passo ${i}`, 5)) };
}

describe("compiti", () => {
  it("crea un compito pulendo gli spazi", () => {
    const c = T.nuovoCompito("x", "  pagare   la bolletta ", NOW);
    expect(c.titolo).toBe("pagare la bolletta");
    expect(c.fatto).toBe(false);
    expect(c.passi).toEqual([]);
  });

  it("divide il testo dettato in compiti, una riga per compito", () => {
    expect(T.dividiInCompiti("- pagare bolletta\n2. chiamare il dentista\n\n• lavatrice; x")).toEqual([
      "pagare bolletta",
      "chiamare il dentista",
      "lavatrice",
    ]);
  });

  it("segna il compito fatto quando l'ultimo passo è fatto", () => {
    let c = compitoConPassi(2);
    c = T.alternaPasso(c, "p0", NOW);
    expect(c.fatto).toBe(false);
    expect(T.primoPassoAperto(c)?.id).toBe("p1");
    c = T.alternaPasso(c, "p1", NOW);
    expect(c.fatto).toBe(true);
    expect(c.fattoIl).toBe(NOW.toISOString());
    expect(T.progresso(c)).toEqual({ fatti: 2, totale: 2 });
    c = T.alternaPasso(c, "p1", NOW);
    expect(c.fatto).toBe(false);
  });

  it("completa tutti i passi e toglie il promemoria", () => {
    const c = T.completa({ ...compitoConPassi(3), promemoria: { ids: ["n1"], dal: NOW.toISOString() } }, NOW);
    expect(c.passi.every((p) => p.fatto)).toBe(true);
    expect(c.promemoria).toBeUndefined();
  });

  it("'non oggi' nasconde il compito solo per oggi", () => {
    const c = T.nonOggi(T.nuovoCompito("a", "Lavatrice", NOW), NOW);
    expect(T.compitiDiOggi([c], NOW)).toHaveLength(0);
    expect(T.rimandatiAdomani([c], NOW)).toHaveLength(1);
    const domani = new Date(2026, 9, 22, 9, 0);
    expect(T.compitiDiOggi([c], domani)).toHaveLength(1);
  });

  it("ordina per scadenza e poi per data di creazione", () => {
    const a = T.nuovoCompito("a", "Senza scadenza", new Date(2026, 9, 1));
    const b = T.nuovoCompito("b", "Scade domani", new Date(2026, 9, 5), "2026-10-22");
    const c = T.nuovoCompito("c", "Scade oggi", new Date(2026, 9, 10), "2026-10-21");
    expect(T.compitiDiOggi([a, b, c], NOW).map((x) => x.id)).toEqual(["c", "b", "a"]);
    expect(T.prioritaSenzaAi([a, b, c], NOW)).toEqual(["c", "b", "a"]);
  });

  it("elenca i compiti fatti oggi e pulisce quelli vecchi", () => {
    const oggi = T.completa(T.nuovoCompito("a", "A", NOW), NOW);
    const vecchio = T.completa(T.nuovoCompito("b", "B", NOW), new Date(2026, 7, 1));
    expect(T.fattiOggi([oggi, vecchio], NOW).map((c) => c.id)).toEqual(["a"]);
    expect(T.pulisciVecchi([oggi, vecchio], NOW).map((c) => c.id)).toEqual(["a"]);
  });
});

describe("promemoria", () => {
  it("calcola una serie finita di orari", () => {
    const orari = orariPromemoria(NOW, 10, 6);
    expect(orari).toHaveLength(6);
    expect(orari[0]).toEqual(NOW);
    expect(orari[5].getTime() - NOW.getTime()).toBe(50 * 60_000);
  });

  it("limita il numero di ripetizioni", () => {
    expect(orariPromemoria(NOW, 5, 100)).toHaveLength(12);
    expect(orariPromemoria(NOW, 5, 0)).toHaveLength(1);
  });
});

describe("tempo", () => {
  it("formatta giorno, timer e scadenze", () => {
    expect(dayKey(NOW)).toBe("2026-10-21");
    expect(formatTimer(125)).toBe("02:05");
    expect(formatTimer(-3)).toBe("00:00");
    expect(etichettaScadenza("2026-10-21", NOW)).toBe("Oggi");
    expect(etichettaScadenza("2026-10-22", NOW)).toBe("Domani");
    expect(etichettaScadenza("2026-10-20", NOW)).toMatch(/In ritardo/);
    expect(etichettaScadenza("2026-11-03", NOW)).toBe("Entro il 3/11");
  });
});

describe("passi di base senza AI", () => {
  it("inizia con un passo di 2 minuti", () => {
    const passi = spezzaSenzaAi("Pulire la cucina.");
    expect(passi[0].minuti).toBeLessThanOrEqual(2);
    expect(passi[0].testo).toContain('"Pulire la cucina"');
    expect(passi.length).toBeGreaterThanOrEqual(3);
  });
});
