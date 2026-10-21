import Constants from "expo-constants";
import { router } from "expo-router";
import { Alert, Linking, Text, View } from "react-native";
import { Bottone, Chip, Etichetta, RigaInterruttore, Scheda, Schermo } from "../../components/ui";
import { DISCLAIMER } from "../../lib/copy";
import { annullaTutto, programmaCheckin } from "../../lib/reminders";
import { useStore } from "../../lib/store";
import { formatOra } from "../../lib/time";
import type { Impostazioni, Orario } from "../../lib/types";
import { colori, spazi, testo } from "../../theme";

const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? "";
const ORARI_MATTINA: [number, number][] = [[7, 30], [8, 30], [9, 30], [10, 30]];
const ORARI_SERA: [number, number][] = [[20, 0], [21, 0], [22, 0], [23, 0]];

export default function ImpostazioniSchermo() {
  const imp = useStore((s) => s.impostazioni);
  const aggiorna = useStore((s) => s.aggiornaImpostazioni);
  const cancellaTutto = useStore((s) => s.cancellaTutto);

  function salva(patch: Partial<Impostazioni>) {
    aggiorna(patch);
    if (patch.checkinMattina || patch.checkinSera) {
      programmaCheckin({ ...useStore.getState().impostazioni }).catch(() => undefined);
    }
  }

  function orario(chiave: "checkinMattina" | "checkinSera", patch: Partial<Orario>) {
    salva({ [chiave]: { ...imp[chiave], ...patch } } as Partial<Impostazioni>);
  }

  return (
    <Schermo>
      <Text style={testo.titolone} accessibilityRole="header">
        Impostazioni
      </Text>

      <Scheda>
        <Etichetta>Promemoria insistenti</Etichetta>
        <Text style={testo.soft}>Ogni quanto ti ricordo un compito, finché non rispondi:</Text>
        <View style={{ flexDirection: "row", gap: spazi.s, flexWrap: "wrap" }} accessibilityRole="radiogroup">
          {([5, 10, 15, 30] as const).map((m) => (
            <Chip key={m} testo={`${m} min`} attivo={imp.intervalloPromemoria === m} onPress={() => salva({ intervalloPromemoria: m })} />
          ))}
        </View>
        <Text style={testo.soft}>Quante volte al massimo:</Text>
        <View style={{ flexDirection: "row", gap: spazi.s, flexWrap: "wrap" }} accessibilityRole="radiogroup">
          {[3, 6, 10].map((n) => (
            <Chip key={n} testo={`${n} volte`} attivo={imp.ripetizioniPromemoria === n} onPress={() => salva({ ripetizioniPromemoria: n })} />
          ))}
        </View>
      </Scheda>

      <Scheda>
        <Etichetta>Check-in</Etichetta>
        <RigaInterruttore
          titolo="Mattina"
          descrizione="Scegliamo insieme le priorità della giornata"
          valore={imp.checkinMattina.attivo}
          onCambia={(attivo) => orario("checkinMattina", { attivo })}
        />
        {imp.checkinMattina.attivo ? (
          <View style={{ flexDirection: "row", gap: spazi.s, flexWrap: "wrap" }}>
            {ORARI_MATTINA.map(([o, m]) => (
              <Chip
                key={`${o}${m}`}
                testo={formatOra(o, m)}
                attivo={imp.checkinMattina.ora === o && imp.checkinMattina.minuto === m}
                onPress={() => orario("checkinMattina", { ora: o, minuto: m })}
              />
            ))}
          </View>
        ) : null}
        <RigaInterruttore
          titolo="Sera"
          descrizione="Guardiamo cosa hai fatto, senza giudizi"
          valore={imp.checkinSera.attivo}
          onCambia={(attivo) => orario("checkinSera", { attivo })}
        />
        {imp.checkinSera.attivo ? (
          <View style={{ flexDirection: "row", gap: spazi.s, flexWrap: "wrap" }}>
            {ORARI_SERA.map(([o, m]) => (
              <Chip
                key={`${o}${m}`}
                testo={formatOra(o, m)}
                attivo={imp.checkinSera.ora === o && imp.checkinSera.minuto === m}
                onPress={() => orario("checkinSera", { ora: o, minuto: m })}
              />
            ))}
          </View>
        ) : null}
        <RigaInterruttore
          titolo="Leggi ad alta voce"
          descrizione="Nel check-in, leggo i messaggi con la voce del telefono"
          valore={imp.leggiAdAltaVoce}
          onCambia={(v) => salva({ leggiAdAltaVoce: v })}
        />
      </Scheda>

      <Scheda>
        <Etichetta>Assistente AI</Etichetta>
        <RigaInterruttore
          titolo="Usa l'assistente AI"
          descrizione="Invio solo il testo dei compiti, che non viene salvato. Spento: passi e priorità di base, tutto resta sul telefono."
          valore={imp.usaAi}
          onCambia={(v) => salva({ usaAi: v })}
        />
      </Scheda>

      <Scheda>
        <Etichetta>Informazioni</Etichetta>
        <Text style={testo.soft}>{DISCLAIMER}</Text>
        <Text style={testo.soft}>
          I tuoi compiti sono salvati solo su questo telefono. Se disinstalli l’app, vengono cancellati.
        </Text>
        {PRIVACY_URL ? (
          <Bottone titolo="Informativa privacy" variante="tenue" onPress={() => Linking.openURL(PRIVACY_URL)} />
        ) : null}
        <Text style={testo.piccolo}>Versione {Constants.expoConfig?.version ?? "?"}</Text>
      </Scheda>

      <Bottone
        titolo="Cancella tutti i dati"
        variante="tenue"
        icona="trash-outline"
        onPress={() =>
          Alert.alert("Cancellare tutto?", "Compiti, passi e impostazioni verranno eliminati da questo telefono.", [
            { text: "Annulla", style: "cancel" },
            {
              text: "Cancella",
              style: "destructive",
              onPress: async () => {
                await annullaTutto();
                cancellaTutto();
                router.replace("/benvenuto");
              },
            },
          ])
        }
      />
      <Text style={[testo.piccolo, { textAlign: "center", color: colori.testoTenue }]}>Passo · un passo alla volta</Text>
    </Schermo>
  );
}
