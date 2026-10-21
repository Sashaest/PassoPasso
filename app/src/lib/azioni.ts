import * as Haptics from "expo-haptics";
import type * as Notifications from "expo-notifications";
import { api } from "./api";
import { spezzaSenzaAi } from "./fallback";
import * as R from "./reminders";
import { useStore } from "./store";
import { compitiDiOggi, prioritaSenzaAi } from "./tasks";
import { addMinutes, dayKey } from "./time";
import type { Focus } from "./types";

/**
 * Azioni che uniscono stato, notifiche e AI. Le schermate chiamano queste funzioni.
 */

const s = () => useStore.getState();
const trova = (id: string) => s().compiti.find((c) => c.id === id);

const vibra = (tipo: "ok" | "tocco" = "tocco") =>
  (tipo === "ok"
    ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  ).catch(() => undefined);

export type EsitoSpezza = { fonte: "ai" | "base"; avviso?: string };

/** Spezza un compito in micro-passi con l'AI; se non si può, usa i passi di base. */
export async function spezzaCompito(id: string): Promise<EsitoSpezza> {
  const c = trova(id);
  if (!c) return { fonte: "base" };

  if (s().impostazioni.usaAi) {
    const r = await api.spezza(s().deviceId, c.titolo);
    if (r.ok) {
      s().impostaPassi(id, r.dati.passi, r.dati.incoraggiamento);
      s().impostaAiRimaste(r.rimaste);
      await vibra();
      return { fonte: "ai" };
    }
    if (r.errore.tipo === "limite") s().impostaAiRimaste(0);
    s().impostaPassi(id, spezzaSenzaAi(c.titolo), "Ecco una traccia di base: puoi modificarla come vuoi.");
    return { fonte: "base", avviso: r.errore.messaggio };
  }

  s().impostaPassi(id, spezzaSenzaAi(c.titolo), "Ecco una traccia di base: puoi modificarla come vuoi.");
  return { fonte: "base" };
}

/** Attiva i promemoria insistenti. Restituisce false se mancano i permessi. */
export async function attivaPromemoria(id: string, tra = s().impostazioni.intervalloPromemoria): Promise<boolean> {
  const c = trova(id);
  if (!c) return false;
  if (!(await R.chiediPermesso())) return false;
  await R.annullaPromemoria(c.promemoria);
  const p = await R.programmaPromemoria(c, s().impostazioni, addMinutes(new Date(), tra));
  s().impostaPromemoria(id, p);
  await vibra();
  return true;
}

export async function disattivaPromemoria(id: string): Promise<void> {
  const c = trova(id);
  await R.annullaPromemoria(c?.promemoria);
  s().impostaPromemoria(id, undefined);
}

export async function completaCompito(id: string): Promise<void> {
  await R.annullaPromemoria(trova(id)?.promemoria);
  s().completa(id);
  await vibra("ok");
}

/** Segna un passo; se era l'ultimo, il compito è fatto e i promemoria si fermano. */
export async function alternaPasso(id: string, passoId: string): Promise<boolean> {
  s().alternaPasso(id, passoId);
  const c = trova(id);
  if (c?.fatto) {
    await R.annullaPromemoria(c.promemoria);
    s().impostaPromemoria(id, undefined);
    await vibra("ok");
    return true;
  }
  await vibra();
  return false;
}

export async function nonOggiCompito(id: string): Promise<void> {
  await R.annullaPromemoria(trova(id)?.promemoria);
  s().nonOggi(id);
}

export async function eliminaCompito(id: string): Promise<void> {
  await R.annullaPromemoria(trova(id)?.promemoria);
  s().elimina(id);
}

/** Gestisce il tocco su una notifica o su uno dei suoi pulsanti. Restituisce la rotta da aprire, se c'è. */
export async function gestisciRisposta(r: Notifications.NotificationResponse): Promise<string | undefined> {
  const data = r.notification.request.content.data as { compitoId?: unknown; url?: unknown } | undefined;
  const compitoId = typeof data?.compitoId === "string" ? data.compitoId : undefined;
  const url = typeof data?.url === "string" ? data.url : undefined;

  if (compitoId && trova(compitoId)) {
    switch (r.actionIdentifier) {
      case R.AZIONE_FATTO:
        await completaCompito(compitoId);
        return "/oggi";
      case R.AZIONE_RIMANDA:
        await attivaPromemoria(compitoId, R.MINUTI_RIMANDA);
        return "/oggi";
      case R.AZIONE_NON_OGGI:
        await nonOggiCompito(compitoId);
        return "/oggi";
    }
  }
  return url;
}

export type EsitoPriorita = { focus: Focus; fonte: "ai" | "base"; avviso?: string };

/** Propone fino a 3 priorità per oggi (con l'AI se attiva). Non le salva: lo fa l'utente confermando. */
export async function proponiPriorita(momento: "mattina" | "sera"): Promise<EsitoPriorita | undefined> {
  const now = new Date();
  const aperti = compitiDiOggi(s().compiti, now);
  if (aperti.length === 0) return undefined;
  const giorno = dayKey(now);

  if (s().impostazioni.usaAi) {
    const r = await api.priorita(s().deviceId, {
      momento,
      oggi: giorno,
      compiti: aperti.map((c) => ({ id: c.id, titolo: c.titolo, scadenza: c.scadenza })),
    });
    if (r.ok && r.dati.priorita.length > 0) {
      s().impostaAiRimaste(r.rimaste);
      return {
        fonte: "ai",
        focus: {
          giorno,
          ids: r.dati.priorita.map((p) => p.id),
          motivi: Object.fromEntries(r.dati.priorita.map((p) => [p.id, p.motivo])),
          messaggio: r.dati.messaggio,
        },
      };
    }
    const avviso = r.ok ? undefined : r.errore.messaggio;
    return { fonte: "base", avviso, focus: { giorno, ids: prioritaSenzaAi(s().compiti, now), motivi: {} } };
  }
  return { fonte: "base", focus: { giorno, ids: prioritaSenzaAi(s().compiti, now), motivi: {} } };
}
