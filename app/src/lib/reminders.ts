import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { Platform } from "react-native";
import { corpoPromemoria } from "./copy";
import { orariPromemoria } from "./schedule";
import { primoPassoAperto } from "./tasks";
import type { Compito, Impostazioni, Promemoria } from "./types";

export const CANALE_PROMEMORIA = "promemoria";
export const CANALE_CHECKIN = "checkin";
export const CATEGORIA_PROMEMORIA = "promemoria_compito";

export const AZIONE_FATTO = "FATTO";
export const AZIONE_RIMANDA = "RIMANDA";
export const AZIONE_NON_OGGI = "NON_OGGI";
export const MINUTI_RIMANDA = 10;

const CHECKIN_MATTINA_ID = "checkin_mattina";
const CHECKIN_SERA_ID = "checkin_sera";

/** Da chiamare una volta all'avvio: comportamento in primo piano, canali Android, pulsanti. */
export async function preparaNotifiche(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CANALE_PROMEMORIA, {
      name: "Promemoria dei compiti",
      description: "Promemoria insistenti finché non rispondi",
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: "#E8833A",
    });
    await Notifications.setNotificationChannelAsync(CANALE_CHECKIN, {
      name: "Check-in mattina e sera",
      importance: AndroidImportance.DEFAULT,
    });
  }

  // I pulsanti aprono l'app: così l'azione viene sempre registrata, anche se l'app era chiusa.
  await Notifications.setNotificationCategoryAsync(CATEGORIA_PROMEMORIA, [
    { identifier: AZIONE_FATTO, buttonTitle: "Fatto", options: { opensAppToForeground: true } },
    {
      identifier: AZIONE_RIMANDA,
      buttonTitle: `Tra ${MINUTI_RIMANDA} min`,
      options: { opensAppToForeground: true },
    },
    { identifier: AZIONE_NON_OGGI, buttonTitle: "Non oggi", options: { opensAppToForeground: true } },
  ]);
}

export async function chiediPermesso(): Promise<boolean> {
  const attuale = await Notifications.getPermissionsAsync();
  if (attuale.granted) return true;
  const richiesta = await Notifications.requestPermissionsAsync();
  return richiesta.granted;
}

export async function permessoConcesso(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Programma la serie di promemoria per un compito. */
export async function programmaPromemoria(
  compito: Compito,
  impostazioni: Pick<Impostazioni, "intervalloPromemoria" | "ripetizioniPromemoria">,
  inizio: Date,
): Promise<Promemoria> {
  const orari = orariPromemoria(inizio, impostazioni.intervalloPromemoria, impostazioni.ripetizioniPromemoria);
  const passo = primoPassoAperto(compito)?.testo;
  const ids: string[] = [];
  for (const [i, quando] of orari.entries()) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: compito.titolo,
        body: corpoPromemoria(i, passo),
        categoryIdentifier: CATEGORIA_PROMEMORIA,
        data: { compitoId: compito.id, url: `/compito/${compito.id}` },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: quando,
        channelId: CANALE_PROMEMORIA,
      },
    });
    ids.push(id);
  }
  return { ids, dal: inizio.toISOString() };
}

export async function annullaPromemoria(promemoria?: Promemoria): Promise<void> {
  if (!promemoria) return;
  await Promise.all(
    promemoria.ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)),
  );
}

/** Riprogramma i check-in giornalieri secondo le impostazioni. */
export async function programmaCheckin(impostazioni: Impostazioni): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(CHECKIN_MATTINA_ID).catch(() => undefined);
  await Notifications.cancelScheduledNotificationAsync(CHECKIN_SERA_ID).catch(() => undefined);

  const { checkinMattina: m, checkinSera: s } = impostazioni;
  if (m.attivo) {
    await Notifications.scheduleNotificationAsync({
      identifier: CHECKIN_MATTINA_ID,
      content: {
        title: "Buongiorno",
        body: "Cosa c'è oggi? Scegliamo insieme le 3 cose che contano.",
        data: { url: "/checkin" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: m.ora,
        minute: m.minuto,
        channelId: CANALE_CHECKIN,
      },
    });
  }
  if (s.attivo) {
    await Notifications.scheduleNotificationAsync({
      identifier: CHECKIN_SERA_ID,
      content: {
        title: "Com'è andata?",
        body: "Guardiamo cosa hai fatto oggi. Il resto aspetta domani.",
        data: { url: "/checkin" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: s.ora,
        minute: s.minuto,
        channelId: CANALE_CHECKIN,
      },
    });
  }
}

export async function annullaTutto(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
