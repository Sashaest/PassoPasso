import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Linking, Text, View } from "react-native";
import { Bottone, RigaInterruttore, Scheda, Schermo } from "../components/ui";
import { DISCLAIMER } from "../lib/copy";
import { chiediPermesso, programmaCheckin } from "../lib/reminders";
import { useStore } from "../lib/store";
import { colori, spazi, testo } from "../theme";

const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? "";

type Pagina = { icona: React.ComponentProps<typeof Ionicons>["name"]; titolo: string; testo: string };

const PAGINE: Pagina[] = [
  {
    icona: "footsteps-outline",
    titolo: "Ciao, sono PassoPasso.",
    testo:
      "Ti aiuto a iniziare le cose e a portarle a termine, un passo piccolo alla volta. Senza liste che fanno paura e senza sensi di colpa.",
  },
  {
    icona: "git-branch-outline",
    titolo: "Come funziona",
    testo:
      "Scrivi o detta quello che devi fare. Lo spezzo in micro-passi da pochi minuti. Ti ricordo le cose con insistenza, finché non rispondi. Il tempo lo vedi scorrere su un timer.",
  },
  {
    icona: "heart-outline",
    titolo: "Niente punizioni",
    testo:
      "Qui non ci sono serie da salvare né numeri rossi. Se salti un giorno, si riparte da adesso. Va bene così.",
  },
];

export default function Benvenuto() {
  const [indice, setIndice] = useState(0);
  const impostazioni = useStore((s) => s.impostazioni);
  const aggiorna = useStore((s) => s.aggiornaImpostazioni);
  const [usaAi, setUsaAi] = useState(impostazioni.usaAi);
  const [caricamento, setCaricamento] = useState(false);

  const ultima = indice === PAGINE.length;

  async function fine() {
    setCaricamento(true);
    try {
      await chiediPermesso();
      const nuove = { ...useStore.getState().impostazioni, usaAi, onboardingFatto: true };
      aggiorna({ usaAi, onboardingFatto: true });
      await programmaCheckin(nuove).catch(() => undefined);
    } finally {
      setCaricamento(false);
      router.replace("/oggi");
    }
  }

  if (!ultima) {
    const p = PAGINE[indice];
    return (
      <Schermo bordi={["top", "bottom"]} scroll={false}>
        <View style={{ flex: 1, justifyContent: "center", gap: spazi.xl }}>
          <Ionicons name={p.icona} size={56} color={colori.accentoScuro} />
          <Text style={testo.titolone} accessibilityRole="header">
            {p.titolo}
          </Text>
          <Text style={[testo.corpo, { fontSize: 19, lineHeight: 28 }]}>{p.testo}</Text>
        </View>
        <Puntini totale={PAGINE.length + 1} attivo={indice} />
        <Bottone titolo="Avanti" icona="arrow-forward" onPress={() => setIndice(indice + 1)} />
      </Schermo>
    );
  }

  return (
    <Schermo bordi={["top", "bottom"]}>
      <Ionicons name="shield-checkmark-outline" size={48} color={colori.accentoScuro} />
      <Text style={testo.titolone} accessibilityRole="header">
        Prima di iniziare
      </Text>

      <Scheda>
        <Text style={testo.sottotitolo}>Non è uno strumento medico</Text>
        <Text style={testo.soft}>{DISCLAIMER}</Text>
      </Scheda>

      <Scheda>
        <RigaInterruttore
          titolo="Usa l'assistente AI"
          descrizione="Per spezzare i compiti e proporti le priorità, invio all'assistente solo il testo dei compiti. Non viene salvato. Se lo spegni, avrai comunque dei passi di base."
          valore={usaAi}
          onCambia={setUsaAi}
        />
        {PRIVACY_URL ? (
          <Text style={[testo.piccolo, { textDecorationLine: "underline" }]} onPress={() => Linking.openURL(PRIVACY_URL)}>
            Leggi l’informativa privacy
          </Text>
        ) : null}
      </Scheda>

      <Scheda>
        <Text style={testo.sottotitolo}>Notifiche</Text>
        <Text style={testo.soft}>
          Ti chiederò il permesso per le notifiche: servono per i promemoria e per il check-in di mattina e sera.
          Puoi cambiare tutto dalle impostazioni.
        </Text>
      </Scheda>

      <Text style={testo.piccolo}>I tuoi compiti restano su questo telefono. Niente account.</Text>
      <Puntini totale={PAGINE.length + 1} attivo={indice} />
      <Bottone titolo="Iniziamo" icona="checkmark" onPress={fine} caricamento={caricamento} />
    </Schermo>
  );
}

function Puntini({ totale, attivo }: { totale: number; attivo: number }) {
  return (
    <View
      style={{ flexDirection: "row", gap: 8, justifyContent: "center", paddingVertical: spazi.m }}
      accessibilityLabel={`Pagina ${attivo + 1} di ${totale}`}
    >
      {Array.from({ length: totale }, (_, i) => (
        <View
          key={i}
          style={{
            width: i === attivo ? 22 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i === attivo ? colori.accentoScuro : colori.bordo,
          }}
        />
      ))}
    </View>
  );
}
