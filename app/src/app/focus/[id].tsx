import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { TimerVisivo } from "../../components/TimerVisivo";
import { Bottone, Schermo, Vuoto } from "../../components/ui";
import { alternaPasso } from "../../lib/azioni";
import { complimento } from "../../lib/copy";
import { useStore } from "../../lib/store";
import { primoPassoAperto, progresso } from "../../lib/tasks";
import type { Compito, Passo } from "../../lib/types";
import { colori, spazi, testo } from "../../theme";

/**
 * Modalità focus: un solo passo sullo schermo, con il timer visivo.
 * Lo schermo resta acceso mentre sei qui.
 */
export default function Focus() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useStore((s) => s.compiti.find((x) => x.id === id));
  const passo = c ? primoPassoAperto(c) : undefined;
  const [messaggio, setMessaggio] = useState<string>();

  if (!c || !passo) {
    return (
      <Schermo bordi={["bottom"]}>
        <Vuoto
          icona="trophy-outline"
          titolo={messaggio ?? "Tutti i passi sono fatti."}
          testo="Bel lavoro. Ora fai una pausa vera."
        />
        <Bottone titolo="Torna a Oggi" variante="successo" onPress={() => router.dismissTo("/oggi")} />
      </Schermo>
    );
  }

  // key = id del passo: a ogni nuovo passo il timer riparte da capo con la sua durata.
  return <PassoConTimer key={passo.id} compito={c} passo={passo} messaggio={messaggio} onFatto={setMessaggio} />;
}

function PassoConTimer({
  compito,
  passo,
  messaggio,
  onFatto,
}: {
  compito: Compito;
  passo: Passo;
  messaggio?: string;
  onFatto: (m: string) => void;
}) {
  const [totale, setTotale] = useState(passo.minuti * 60);
  const [pausaRestanti, setPausaRestanti] = useState(passo.minuti * 60);
  const [fineAlle, setFineAlle] = useState<number | null>(null);
  const [adesso, setAdesso] = useState(() => Date.now());
  const avvisato = useRef(false);

  useEffect(() => {
    if (fineAlle === null) return;
    const t = setInterval(() => setAdesso(Date.now()), 250);
    return () => clearInterval(t);
  }, [fineAlle]);

  const restanti = fineAlle !== null ? Math.max(0, (fineAlle - adesso) / 1000) : pausaRestanti;

  useEffect(() => {
    if (fineAlle !== null && restanti <= 0 && !avvisato.current) {
      avvisato.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    }
  }, [restanti, fineAlle]);

  const { fatti, totale: nPassi } = progresso(compito);
  const inCorso = fineAlle !== null;

  function avvia() {
    const ora = Date.now();
    setAdesso(ora);
    setFineAlle(ora + pausaRestanti * 1000);
  }
  function pausa() {
    setPausaRestanti(restanti);
    setFineAlle(null);
  }
  function piuCinque() {
    setTotale((t) => t + 300);
    avvisato.current = false;
    if (inCorso) setFineAlle((f) => (f ?? Date.now()) + 300_000);
    else setPausaRestanti((r) => r + 300);
  }
  async function fatto() {
    await alternaPasso(compito.id, passo.id);
    onFatto(complimento());
  }

  return (
    <Schermo bordi={["bottom"]} scroll={false}>
      <View style={{ gap: spazi.xs }}>
        <Text style={testo.piccolo}>
          {compito.titolo} · passo {fatti + 1} di {nPassi}
        </Text>
        {messaggio ? <Text style={[testo.soft, { color: colori.successo }]}>{messaggio}</Text> : null}
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spazi.xl }}>
        <Text style={[testo.titolone, { textAlign: "center" }]} accessibilityRole="header">
          {passo.testo}
        </Text>
        <TimerVisivo totaleSec={totale} restantiSec={restanti} />
      </View>

      <View style={{ gap: spazi.s }}>
        <Bottone titolo="Fatto, avanti" variante="successo" icona="checkmark" onPress={fatto} />
        <View style={{ flexDirection: "row", gap: spazi.s }}>
          <Bottone
            stile={{ flex: 1 }}
            titolo={inCorso ? "Pausa" : restanti < totale ? "Riprendi" : "Avvia timer"}
            variante="secondario"
            icona={inCorso ? "pause" : "play"}
            onPress={inCorso ? pausa : avvia}
          />
          <Bottone stile={{ flex: 1 }} titolo="+5 min" variante="tenue" onPress={piuCinque} />
        </View>
        <Bottone titolo="Esci" variante="tenue" onPress={() => router.back()} />
      </View>
    </Schermo>
  );
}
