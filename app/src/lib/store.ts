import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as T from "./tasks";
import type { Compito, Focus, Impostazioni, Passo, Promemoria } from "./types";

/**
 * Stato dell'app. Tutto resta sul telefono (AsyncStorage): niente account, niente server.
 */

export const IMPOSTAZIONI_INIZIALI: Impostazioni = {
  onboardingFatto: false,
  usaAi: true,
  intervalloPromemoria: 10,
  ripetizioniPromemoria: 6,
  checkinMattina: { attivo: true, ora: 8, minuto: 30 },
  checkinSera: { attivo: true, ora: 21, minuto: 0 },
  leggiAdAltaVoce: false,
};

type Stato = {
  deviceId: string;
  compiti: Compito[];
  focus?: Focus;
  impostazioni: Impostazioni;
  aiRimaste?: number;

  aggiungiCompito: (titolo: string, scadenza?: string) => string;
  aggiungiCompiti: (titoli: string[]) => string[];
  rinomina: (id: string, titolo: string) => void;
  impostaScadenza: (id: string, scadenza?: string) => void;
  impostaPassi: (id: string, passi: { testo: string; minuti: number }[], incoraggiamento?: string) => void;
  aggiungiPasso: (id: string, testo: string, minuti?: number) => void;
  rimuoviPasso: (id: string, passoId: string) => void;
  alternaPasso: (id: string, passoId: string) => void;
  completa: (id: string) => void;
  riapri: (id: string) => void;
  nonOggi: (id: string) => void;
  elimina: (id: string) => void;
  impostaPromemoria: (id: string, promemoria?: Promemoria) => void;
  impostaFocus: (focus?: Focus) => void;
  aggiornaImpostazioni: (patch: Partial<Impostazioni>) => void;
  impostaAiRimaste: (n?: number) => void;
  cancellaTutto: () => void;
};

const aggiorna = (compiti: Compito[], id: string, fn: (c: Compito) => Compito) =>
  compiti.map((c) => (c.id === id ? fn(c) : c));

export const useStore = create<Stato>()(
  persist(
    (set) => ({
      deviceId: randomUUID(),
      compiti: [],
      impostazioni: IMPOSTAZIONI_INIZIALI,

      aggiungiCompito: (titolo, scadenza) => {
        const c = T.nuovoCompito(randomUUID(), titolo, new Date(), scadenza);
        set((s) => ({ compiti: [...s.compiti, c] }));
        return c.id;
      },
      aggiungiCompiti: (titoli) => {
        const now = new Date();
        const nuovi = titoli.map((t) => T.nuovoCompito(randomUUID(), t, now));
        set((s) => ({ compiti: [...s.compiti, ...nuovi] }));
        return nuovi.map((c) => c.id);
      },
      rinomina: (id, titolo) =>
        set((s) => ({ compiti: aggiorna(s.compiti, id, (c) => ({ ...c, titolo: titolo.trim() || c.titolo })) })),
      impostaScadenza: (id, scadenza) =>
        set((s) => ({ compiti: aggiorna(s.compiti, id, (c) => ({ ...c, scadenza })) })),
      impostaPassi: (id, passi, incoraggiamento) =>
        set((s) => ({
          compiti: aggiorna(s.compiti, id, (c) => ({
            ...c,
            passi: passi.map((p) => T.nuovoPasso(randomUUID(), p.testo, p.minuti)),
            incoraggiamento,
            fatto: false,
            fattoIl: undefined,
          })),
        })),
      aggiungiPasso: (id, testo, minuti) =>
        set((s) => ({
          compiti: aggiorna(s.compiti, id, (c) => ({
            ...c,
            passi: [...c.passi, T.nuovoPasso(randomUUID(), testo, minuti)] as Passo[],
            fatto: false,
            fattoIl: undefined,
          })),
        })),
      rimuoviPasso: (id, passoId) =>
        set((s) => ({
          compiti: aggiorna(s.compiti, id, (c) => ({ ...c, passi: c.passi.filter((p) => p.id !== passoId) })),
        })),
      alternaPasso: (id, passoId) =>
        set((s) => ({ compiti: aggiorna(s.compiti, id, (c) => T.alternaPasso(c, passoId, new Date())) })),
      completa: (id) => set((s) => ({ compiti: aggiorna(s.compiti, id, (c) => T.completa(c, new Date())) })),
      riapri: (id) => set((s) => ({ compiti: aggiorna(s.compiti, id, T.riapri) })),
      nonOggi: (id) => set((s) => ({ compiti: aggiorna(s.compiti, id, (c) => T.nonOggi(c, new Date())) })),
      elimina: (id) =>
        set((s) => ({
          compiti: s.compiti.filter((c) => c.id !== id),
          focus: s.focus ? { ...s.focus, ids: s.focus.ids.filter((x) => x !== id) } : undefined,
        })),
      impostaPromemoria: (id, promemoria) =>
        set((s) => ({ compiti: aggiorna(s.compiti, id, (c) => ({ ...c, promemoria })) })),
      impostaFocus: (focus) => set({ focus }),
      aggiornaImpostazioni: (patch) => set((s) => ({ impostazioni: { ...s.impostazioni, ...patch } })),
      impostaAiRimaste: (aiRimaste) => set({ aiRimaste }),
      cancellaTutto: () =>
        set({ compiti: [], focus: undefined, impostazioni: IMPOSTAZIONI_INIZIALI, deviceId: randomUUID() }),
    }),
    {
      name: "passo-stato",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        deviceId: s.deviceId,
        compiti: s.compiti,
        focus: s.focus,
        impostazioni: s.impostazioni,
      }),
      onRehydrateStorage: () => () => {
        useStore.setState((s) => ({ compiti: T.pulisciVecchi(s.compiti, new Date()) }));
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Stato>;
        return {
          ...current,
          ...p,
          impostazioni: { ...IMPOSTAZIONI_INIZIALI, ...(p.impostazioni ?? {}) },
        };
      },
    },
  ),
);

/** true quando i dati salvati sul telefono sono stati caricati */
export const useIdratato = () =>
  useSyncExternalStore(
    (avvisa) => useStore.persist.onFinishHydration(avvisa),
    () => useStore.persist.hasHydrated(),
  );
