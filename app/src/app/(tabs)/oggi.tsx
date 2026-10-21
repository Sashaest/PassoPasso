import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Bottone, Casella, Etichetta, Scheda, Schermo, Vuoto } from "../../components/ui";
import { completaCompito } from "../../lib/azioni";
import { ripartenza } from "../../lib/copy";
import { useStore } from "../../lib/store";
import { compitiDiOggi, fattiOggi, progresso, rimandatiAdomani } from "../../lib/tasks";
import { dayKey, etichettaScadenza, saluto } from "../../lib/time";
import type { Compito } from "../../lib/types";
import { colori, raggi, spazi, testo } from "../../theme";

export default function Oggi() {
  const compiti = useStore((s) => s.compiti);
  const focus = useStore((s) => s.focus);
  const aggiungi = useStore((s) => s.aggiungiCompito);
  const [nuovo, setNuovo] = useState("");
  const [mostraFatti, setMostraFatti] = useState(false);

  const now = new Date();
  const oggi = dayKey(now);
  const aperti = useMemo(() => compitiDiOggi(compiti, now), [compiti, oggi]); // eslint-disable-line react-hooks/exhaustive-deps
  const fatti = useMemo(() => fattiOggi(compiti, now), [compiti, oggi]); // eslint-disable-line react-hooks/exhaustive-deps
  const rimandati = useMemo(() => rimandatiAdomani(compiti, now), [compiti, oggi]); // eslint-disable-line react-hooks/exhaustive-deps

  const focusOggi = focus?.giorno === oggi ? focus : undefined;
  const inFocus = focusOggi ? aperti.filter((c) => focusOggi.ids.includes(c.id)) : [];
  const altri = aperti.filter((c) => !inFocus.includes(c));

  function aggiungiCompito() {
    const t = nuovo.trim();
    if (t.length < 2) return;
    const id = aggiungi(t);
    setNuovo("");
    router.push(`/compito/${id}`);
  }

  return (
    <Schermo>
      <View style={{ gap: 4 }}>
        <Text style={testo.titolone} accessibilityRole="header">
          {saluto(now)}
        </Text>
        <Text style={testo.soft}>
          {aperti.length === 0
            ? "Niente in lista per oggi."
            : focusOggi?.messaggio ?? ripartenza(now.getDate())}
        </Text>
      </View>

      <View style={st.inserisci}>
        <TextInput
          value={nuovo}
          onChangeText={setNuovo}
          onSubmitEditing={aggiungiCompito}
          placeholder="Cosa devi fare? (puoi anche dettarlo)"
          placeholderTextColor={colori.testoTenue}
          style={st.input}
          returnKeyType="done"
          maxLength={300}
          accessibilityLabel="Nuovo compito"
        />
        <Pressable
          onPress={aggiungiCompito}
          style={st.piu}
          accessibilityRole="button"
          accessibilityLabel="Aggiungi compito"
        >
          <Ionicons name="add" size={28} color={colori.inchiostro} />
        </Pressable>
      </View>

      {inFocus.length > 0 ? (
        <View style={{ gap: spazi.s }}>
          <Etichetta>Le priorità di oggi</Etichetta>
          {inFocus.map((c) => (
            <RigaCompito key={c.id} c={c} motivo={focusOggi?.motivi[c.id]} evidenza />
          ))}
        </View>
      ) : aperti.length > 1 ? (
        <Bottone
          titolo="Scegli le 3 priorità di oggi"
          variante="tenue"
          icona="sparkles-outline"
          onPress={() => router.push("/checkin")}
        />
      ) : null}

      {altri.length > 0 ? (
        <View style={{ gap: spazi.s }}>
          {inFocus.length > 0 ? <Etichetta>Il resto può aspettare</Etichetta> : null}
          {altri.map((c) => (
            <RigaCompito key={c.id} c={c} />
          ))}
        </View>
      ) : null}

      {aperti.length === 0 ? (
        <Vuoto
          icona="leaf-outline"
          titolo={fatti.length > 0 ? "Per oggi hai fatto abbastanza." : "Lista vuota. Va benissimo così."}
          testo="Quando ti viene in mente qualcosa, scrivilo qui sopra: al resto pensiamo un passo alla volta."
        />
      ) : null}

      {fatti.length > 0 ? (
        <Scheda stile={{ backgroundColor: colori.successoChiaro, borderColor: colori.successoChiaro }}>
          <Pressable
            onPress={() => setMostraFatti(!mostraFatti)}
            accessibilityRole="button"
            accessibilityState={{ expanded: mostraFatti }}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
          >
            <Text style={[testo.sottotitolo, { color: colori.successo }]}>
              Fatte oggi: {fatti.length}
            </Text>
            <Ionicons name={mostraFatti ? "chevron-up" : "chevron-down"} size={22} color={colori.successo} />
          </Pressable>
          {mostraFatti
            ? fatti.map((c) => (
                <Casella key={c.id} fatto testo={c.titolo} onPress={() => router.push(`/compito/${c.id}`)} />
              ))
            : null}
        </Scheda>
      ) : null}

      {rimandati.length > 0 ? (
        <Text style={testo.piccolo}>
          {rimandati.length === 1 ? "1 compito rimandato" : `${rimandati.length} compiti rimandati`} a domani.
        </Text>
      ) : null}
    </Schermo>
  );
}

function RigaCompito({ c, motivo, evidenza }: { c: Compito; motivo?: string; evidenza?: boolean }) {
  const { fatti, totale } = progresso(c);
  const dettagli = [
    motivo,
    // se c'è già il motivo della priorità (es. "Scade oggi"), non ripetiamo la scadenza
    !motivo && c.scadenza ? etichettaScadenza(c.scadenza) : undefined,
    totale > 0 ? `${fatti}/${totale} passi` : "Da spezzare in passi",
    c.promemoria ? "Promemoria attivo" : undefined,
  ].filter(Boolean);

  return (
    <View style={[st.riga, evidenza && st.rigaEvidenza]}>
      <Pressable
        onPress={() => completaCompito(c.id)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Segna come fatto: ${c.titolo}`}
      >
        <Ionicons name="ellipse-outline" size={30} color={colori.testoTenue} />
      </Pressable>
      <Pressable
        style={{ flex: 1, gap: 2 }}
        onPress={() => router.push(`/compito/${c.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Apri ${c.titolo}`}
      >
        <Text style={testo.sottotitolo}>{c.titolo}</Text>
        <Text style={testo.piccolo}>{dettagli.join(" · ")}</Text>
      </Pressable>
      <Ionicons name="chevron-forward" size={20} color={colori.testoTenue} />
    </View>
  );
}

const st = StyleSheet.create({
  inserisci: { flexDirection: "row", gap: spazi.s, alignItems: "center" },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    backgroundColor: colori.superficie,
    borderRadius: raggi.m,
    borderWidth: 1.5,
    borderColor: colori.bordo,
    paddingHorizontal: spazi.l,
    fontSize: 17,
    color: colori.inchiostro,
  },
  piu: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colori.accento,
    alignItems: "center",
    justifyContent: "center",
  },
  riga: {
    flexDirection: "row",
    alignItems: "center",
    gap: spazi.m,
    backgroundColor: colori.superficie,
    borderRadius: raggi.m,
    borderWidth: 1,
    borderColor: colori.bordo,
    padding: spazi.l,
  },
  rigaEvidenza: { borderColor: colori.accento, borderWidth: 2 },
});
