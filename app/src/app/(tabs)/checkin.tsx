import { router } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Avviso, Bottone, Casella, Chip, Etichetta, Scheda, Schermo } from "../../components/ui";
import { proponiPriorita, type EsitoPriorita } from "../../lib/azioni";
import { useStore } from "../../lib/store";
import { compitiDiOggi, dividiInCompiti, fattiOggi } from "../../lib/tasks";
import { dayKey, momentoDelGiorno } from "../../lib/time";
import { colori, raggi, spazi, testo } from "../../theme";

export default function Checkin() {
  const [momento, setMomento] = useState(momentoDelGiorno());
  return (
    <Schermo>
      <Text style={testo.titolone} accessibilityRole="header">
        {momento === "mattina" ? "Cosa c'è oggi?" : "Com'è andata oggi?"}
      </Text>
      <View style={{ flexDirection: "row", gap: spazi.s }} accessibilityRole="radiogroup">
        <Chip testo="Mattina" attivo={momento === "mattina"} onPress={() => setMomento("mattina")} />
        <Chip testo="Sera" attivo={momento === "sera"} onPress={() => setMomento("sera")} />
      </View>
      {momento === "mattina" ? <Mattina /> : <Sera />}
    </Schermo>
  );
}

function leggi(testoDaLeggere: string, attivo: boolean) {
  if (!attivo) return;
  Speech.stop().finally(() => Speech.speak(testoDaLeggere, { language: "it-IT", rate: 0.95 }));
}

function Mattina() {
  const compiti = useStore((s) => s.compiti);
  const aggiungiCompiti = useStore((s) => s.aggiungiCompiti);
  const impostaFocus = useStore((s) => s.impostaFocus);
  const leggiAdAltaVoce = useStore((s) => s.impostazioni.leggiAdAltaVoce);

  const [scarico, setScarico] = useState("");
  const [proposta, setProposta] = useState<EsitoPriorita>();
  const [caricamento, setCaricamento] = useState(false);
  const aperti = useMemo(() => compitiDiOggi(compiti, new Date()), [compiti]);

  useEffect(() => () => void Speech.stop(), []);

  function aggiungi() {
    const righe = dividiInCompiti(scarico);
    if (righe.length === 0) return;
    aggiungiCompiti(righe);
    setScarico("");
    setProposta(undefined);
  }

  async function proponi() {
    setCaricamento(true);
    const r = await proponiPriorita("mattina");
    setProposta(r);
    setCaricamento(false);
    if (r?.focus.messaggio) leggi(r.focus.messaggio, leggiAdAltaVoce);
  }

  const titoloDi = (id: string) => compiti.find((c) => c.id === id)?.titolo ?? "";

  return (
    <>
      <Scheda>
        <Text style={testo.sottotitolo}>Svuota la testa</Text>
        <Text style={testo.soft}>
          Scrivi o detta (tocca il microfono della tastiera) tutto quello che ti gira in testa. Una riga per ogni cosa.
        </Text>
        <TextInput
          value={scarico}
          onChangeText={setScarico}
          multiline
          placeholder={"pagare la bolletta\nchiamare il dentista\nlavatrice"}
          placeholderTextColor={colori.testoTenue}
          style={st.area}
          accessibilityLabel="Cose da fare, una per riga"
        />
        <Bottone titolo="Aggiungi alla lista" variante="tenue" icona="add" onPress={aggiungi} disabilitato={!scarico.trim()} />
      </Scheda>

      {aperti.length > 0 ? (
        <Bottone
          titolo={proposta ? "Proponi di nuovo" : "Scegli con me le 3 priorità"}
          icona="sparkles-outline"
          caricamento={caricamento}
          onPress={proponi}
        />
      ) : (
        <Text style={testo.soft}>Quando hai qualcosa in lista, ti aiuto a scegliere da dove partire.</Text>
      )}

      {proposta ? (
        <Scheda>
          <Etichetta>Proposta per oggi</Etichetta>
          {proposta.focus.messaggio ? <Text style={testo.corpo}>{proposta.focus.messaggio}</Text> : null}
          {proposta.focus.ids.map((id, i) => (
            <View key={id} style={{ flexDirection: "row", gap: spazi.m }}>
              <Text style={[testo.titolo, { color: colori.accentoScuro, width: 22 }]}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={testo.sottotitolo}>{titoloDi(id)}</Text>
                {proposta.focus.motivi[id] ? <Text style={testo.piccolo}>{proposta.focus.motivi[id]}</Text> : null}
              </View>
            </View>
          ))}
          {proposta.avviso ? <Avviso>{proposta.avviso} Ho scelto in base alle scadenze.</Avviso> : null}
          <Bottone
            titolo="Va bene così"
            variante="secondario"
            icona="checkmark"
            onPress={() => {
              impostaFocus(proposta.focus);
              router.push("/oggi");
            }}
          />
        </Scheda>
      ) : null}
    </>
  );
}

function Sera() {
  const compiti = useStore((s) => s.compiti);
  const focus = useStore((s) => s.focus);
  const leggiAdAltaVoce = useStore((s) => s.impostazioni.leggiAdAltaVoce);
  const nonOggi = useStore((s) => s.nonOggi);
  const now = new Date();
  const fatti = useMemo(() => fattiOggi(compiti, now), [compiti]); // eslint-disable-line react-hooks/exhaustive-deps
  const priorita = focus?.giorno === dayKey(now) ? focus.ids : [];
  const restanti = compiti.filter((c) => priorita.includes(c.id) && !c.fatto);

  const frase =
    fatti.length === 0
      ? "Oggi è andata così, e va bene. Domani si riparte da un passo piccolo."
      : fatti.length === 1
        ? "Hai portato a termine una cosa. Conta."
        : `Hai portato a termine ${fatti.length} cose. Conta, tutte.`;

  useEffect(() => {
    leggi(frase, leggiAdAltaVoce);
    return () => void Speech.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Scheda stile={{ backgroundColor: colori.successoChiaro, borderColor: colori.successoChiaro }}>
        <Text style={[testo.sottotitolo, { color: colori.successo }]}>{frase}</Text>
        {fatti.map((c) => (
          <Casella key={c.id} fatto testo={c.titolo} onPress={() => router.push(`/compito/${c.id}`)} />
        ))}
      </Scheda>

      {restanti.length > 0 ? (
        <Scheda>
          <Etichetta>Priorità rimaste aperte</Etichetta>
          <Text style={testo.soft}>Nessun problema. Le sposto a domani?</Text>
          {restanti.map((c) => (
            <Text key={c.id} style={testo.corpo}>
              · {c.titolo}
            </Text>
          ))}
          <Bottone
            titolo="Sì, a domani"
            variante="tenue"
            icona="moon-outline"
            onPress={() => restanti.forEach((c) => nonOggi(c.id))}
          />
        </Scheda>
      ) : null}

      <Text style={testo.soft}>
        Prima di dormire: c’è qualcosa che ti preoccupa per domani? Scrivilo nella lista, così la testa può riposare.
      </Text>
      <Bottone titolo="Apri la lista" variante="tenue" onPress={() => router.push("/oggi")} />
    </>
  );
}

const st = StyleSheet.create({
  area: {
    minHeight: 120,
    textAlignVertical: "top",
    backgroundColor: colori.sfondo,
    borderRadius: raggi.m,
    borderWidth: 1.5,
    borderColor: colori.bordo,
    padding: spazi.m,
    fontSize: 17,
    color: colori.inchiostro,
  },
});
