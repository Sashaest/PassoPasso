import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Avviso, Bottone, Casella, Chip, Etichetta, RigaInterruttore, Scheda, Schermo, Vuoto } from "../../components/ui";
import {
  alternaPasso,
  attivaPromemoria,
  completaCompito,
  disattivaPromemoria,
  eliminaCompito,
  nonOggiCompito,
  spezzaCompito,
} from "../../lib/azioni";
import { complimento } from "../../lib/copy";
import { useStore } from "../../lib/store";
import { primoPassoAperto, progresso } from "../../lib/tasks";
import { addDays, dayKey } from "../../lib/time";
import { colori, raggi, spazi, testo } from "../../theme";

export default function DettaglioCompito() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useStore((s) => s.compiti.find((x) => x.id === id));
  const intervallo = useStore((s) => s.impostazioni.intervalloPromemoria);
  const aiRimaste = useStore((s) => s.aiRimaste);
  const usaAi = useStore((s) => s.impostazioni.usaAi);
  const impostaScadenza = useStore((s) => s.impostaScadenza);
  const aggiungiPasso = useStore((s) => s.aggiungiPasso);
  const rimuoviPasso = useStore((s) => s.rimuoviPasso);
  const rinomina = useStore((s) => s.rinomina);
  const riapri = useStore((s) => s.riapri);

  const [caricamento, setCaricamento] = useState(false);
  const [avviso, setAvviso] = useState<string>();
  const [nuovoPasso, setNuovoPasso] = useState("");
  const [festa, setFesta] = useState<string>();

  if (!c) {
    return (
      <Schermo bordi={[]}>
        <Vuoto icona="help-circle-outline" titolo="Compito non trovato" testo="Forse l'hai già eliminato." />
        <Bottone titolo="Torna a Oggi" onPress={() => router.replace("/oggi")} />
      </Schermo>
    );
  }

  const compito = c;
  const { fatti, totale } = progresso(compito);
  const prossimo = primoPassoAperto(compito);
  const oggi = dayKey();
  const domani = dayKey(addDays(new Date(), 1));

  async function spezza() {
    setCaricamento(true);
    setAvviso(undefined);
    const r = await spezzaCompito(compito.id);
    setAvviso(r.avviso);
    setCaricamento(false);
  }

  async function togglePromemoria(attivo: boolean) {
    if (attivo) {
      const ok = await attivaPromemoria(compito.id);
      if (!ok) {
        Alert.alert(
          "Notifiche disattivate",
          "Per i promemoria servono le notifiche. Puoi attivarle dalle impostazioni del telefono.",
        );
      }
    } else {
      await disattivaPromemoria(compito.id);
    }
  }

  async function segnaPasso(passoId: string) {
    const finito = await alternaPasso(compito.id, passoId);
    if (finito) setFesta(complimento());
  }

  function aggiungi() {
    const t = nuovoPasso.trim();
    if (t.length < 2) return;
    aggiungiPasso(compito.id, t, 5);
    setNuovoPasso("");
  }

  function conferma(titolo: string, messaggio: string, azione: () => void) {
    Alert.alert(titolo, messaggio, [
      { text: "Annulla", style: "cancel" },
      { text: "Sì", style: "destructive", onPress: azione },
    ]);
  }

  return (
    <Schermo bordi={[]}>
      <Stack.Screen options={{ title: compito.fatto ? "Fatto" : "Compito" }} />

      <TextInput
        defaultValue={compito.titolo}
        onEndEditing={(e) => rinomina(compito.id, e.nativeEvent.text)}
        style={[testo.titolo, st.titolo]}
        multiline
        maxLength={300}
        accessibilityLabel="Titolo del compito"
      />

      {festa || compito.fatto ? (
        <Scheda stile={{ backgroundColor: colori.successoChiaro, borderColor: colori.successoChiaro }}>
          <Text style={[testo.sottotitolo, { color: colori.successo }]}>{festa ?? "Questo è fatto."}</Text>
          <View style={{ flexDirection: "row", gap: spazi.s, flexWrap: "wrap" }}>
            <Bottone titolo="Torna a Oggi" variante="successo" onPress={() => router.back()} />
            {compito.fatto ? (
              <Bottone titolo="Riapri" variante="tenue" onPress={() => { setFesta(undefined); riapri(compito.id); }} />
            ) : null}
          </View>
        </Scheda>
      ) : null}

      {!compito.fatto ? (
        <View style={{ flexDirection: "row", gap: spazi.s, flexWrap: "wrap" }} accessibilityRole="radiogroup">
          <Chip testo="Oggi" attivo={compito.scadenza === oggi} onPress={() => impostaScadenza(compito.id, oggi)} />
          <Chip testo="Domani" attivo={compito.scadenza === domani} onPress={() => impostaScadenza(compito.id, domani)} />
          <Chip testo="Senza fretta" attivo={!compito.scadenza} onPress={() => impostaScadenza(compito.id, undefined)} />
        </View>
      ) : null}

      <View style={{ gap: spazi.s }}>
        <Etichetta>{totale > 0 ? `Micro-passi · ${fatti}/${totale}` : "Micro-passi"}</Etichetta>

        {compito.incoraggiamento && !compito.fatto ? (
          <Text style={[testo.soft, { fontStyle: "italic" }]}>{compito.incoraggiamento}</Text>
        ) : null}

        {compito.passi.map((p) => (
          <Casella
            key={p.id}
            fatto={p.fatto}
            testo={p.testo}
            sotto={`${p.minuti} min`}
            onPress={() => segnaPasso(p.id)}
            onLungo={() => conferma("Togliere questo passo?", p.testo, () => rimuoviPasso(compito.id, p.id))}
          />
        ))}

        {totale === 0 && !compito.fatto ? (
          <Text style={testo.soft}>
            Un compito intero può bloccare. Spezziamolo in passi così piccoli da poter iniziare subito.
          </Text>
        ) : null}

        {avviso ? <Avviso>{avviso}</Avviso> : null}

        {!compito.fatto ? (
          <>
            <Bottone
              titolo={totale === 0 ? "Spezza in micro-passi" : "Rifai i passi"}
              variante={totale === 0 ? "primario" : "tenue"}
              icona="sparkles-outline"
              caricamento={caricamento}
              onPress={spezza}
            />
            {usaAi && aiRimaste !== undefined && aiRimaste <= 3 ? (
              <Text style={testo.piccolo}>
                {aiRimaste === 0
                  ? "Aiuti AI di oggi finiti: userò i passi di base fino a domani."
                  : `Ancora ${aiRimaste} aiuti AI gratuiti oggi.`}
              </Text>
            ) : null}
            <View style={st.aggiungi}>
              <TextInput
                value={nuovoPasso}
                onChangeText={setNuovoPasso}
                onSubmitEditing={aggiungi}
                placeholder="Aggiungi un passo a mano"
                placeholderTextColor={colori.testoTenue}
                style={st.input}
                maxLength={160}
                accessibilityLabel="Nuovo passo"
              />
              <Pressable onPress={aggiungi} style={st.piu} accessibilityRole="button" accessibilityLabel="Aggiungi passo">
                <Ionicons name="add" size={24} color={colori.inchiostro} />
              </Pressable>
            </View>
          </>
        ) : null}
      </View>

      {!compito.fatto && prossimo ? (
        <Bottone
          titolo="Inizia il prossimo passo"
          variante="secondario"
          icona="play"
          onPress={() => router.push(`/focus/${compito.id}`)}
        />
      ) : null}

      {!compito.fatto ? (
        <Scheda>
          <RigaInterruttore
            titolo="Ricordamelo con insistenza"
            descrizione={
              compito.promemoria
                ? `Attivo: ogni ${intervallo} minuti, finché non rispondi.`
                : `Una notifica ogni ${intervallo} minuti finché non rispondi: Fatto, Rimanda o Non oggi.`
            }
            valore={!!compito.promemoria}
            onCambia={togglePromemoria}
          />
        </Scheda>
      ) : null}

      {!compito.fatto ? (
        <View style={{ gap: spazi.s }}>
          <Bottone titolo="Fatto tutto" variante="successo" icona="checkmark" onPress={async () => {
            await completaCompito(compito.id);
            setFesta(complimento());
          }} />
          <Bottone
            titolo="Non oggi"
            variante="tenue"
            icona="moon-outline"
            onPress={async () => {
              await nonOggiCompito(compito.id);
              router.back();
            }}
            accessibilityHint="Nasconde il compito fino a domani, senza perderlo"
          />
        </View>
      ) : null}

      <Pressable
        onPress={() =>
          conferma("Eliminare il compito?", compito.titolo, async () => {
            await eliminaCompito(compito.id);
            router.back();
          })
        }
        accessibilityRole="button"
        style={{ alignSelf: "center", padding: spazi.m }}
      >
        <Text style={[testo.soft, { color: colori.pericolo }]}>Elimina compito</Text>
      </Pressable>
    </Schermo>
  );
}

const st = StyleSheet.create({
  titolo: {
    backgroundColor: colori.superficie,
    borderRadius: raggi.m,
    borderWidth: 1,
    borderColor: colori.bordo,
    padding: spazi.l,
  },
  aggiungi: { flexDirection: "row", gap: spazi.s, alignItems: "center" },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    backgroundColor: colori.superficie,
    borderRadius: raggi.m,
    borderWidth: 1.5,
    borderColor: colori.bordo,
    paddingHorizontal: spazi.l,
    fontSize: 16,
    color: colori.inchiostro,
  },
  piu: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colori.superficieAlta,
    alignItems: "center",
    justifyContent: "center",
  },
});
