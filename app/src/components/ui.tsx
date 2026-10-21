import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colori, raggi, spazi, testo } from "../theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

export function Schermo({
  children,
  scroll = true,
  bordi = ["top"],
}: {
  children: ReactNode;
  scroll?: boolean;
  bordi?: ("top" | "bottom")[];
}) {
  return (
    <SafeAreaView style={st.schermo} edges={bordi}>
      {scroll ? (
        <ScrollView contentContainerStyle={st.contenuto} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[st.contenuto, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

type Variante = "primario" | "secondario" | "tenue" | "successo";

export function Bottone({
  titolo,
  onPress,
  variante = "primario",
  icona,
  caricamento,
  disabilitato,
  stile,
  accessibilityHint,
}: {
  titolo: string;
  onPress: () => void;
  variante?: Variante;
  icona?: IconName;
  caricamento?: boolean;
  disabilitato?: boolean;
  stile?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const v = varianti[variante];
  const off = disabilitato || caricamento;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titolo}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!off, busy: !!caricamento }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [st.bottone, v.box, pressed && { opacity: 0.85 }, off && { opacity: 0.55 }, stile]}
    >
      {caricamento ? (
        <ActivityIndicator color={v.testo.color} />
      ) : (
        <>
          {icona ? <Ionicons name={icona} size={20} color={v.testo.color} /> : null}
          <Text style={[st.bottoneTesto, v.testo]}>{titolo}</Text>
        </>
      )}
    </Pressable>
  );
}

const varianti: Record<Variante, { box: ViewStyle; testo: { color: string } }> = {
  primario: { box: { backgroundColor: colori.accento }, testo: { color: colori.inchiostro } },
  secondario: { box: { backgroundColor: colori.inchiostro }, testo: { color: colori.bianco } },
  tenue: {
    box: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colori.bordo },
    testo: { color: colori.inchiostro },
  },
  successo: { box: { backgroundColor: colori.successo }, testo: { color: colori.bianco } },
};

export function Scheda({ children, stile }: { children: ReactNode; stile?: StyleProp<ViewStyle> }) {
  return <View style={[st.scheda, stile]}>{children}</View>;
}

export function Etichetta({ children }: { children: ReactNode }) {
  return <Text style={testo.etichetta}>{children}</Text>;
}

export function Chip({
  testo: t,
  attivo,
  onPress,
}: {
  testo: string;
  attivo?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: !!attivo }}
      onPress={onPress}
      style={[st.chip, attivo && st.chipAttivo]}
    >
      <Text style={[st.chipTesto, attivo && { color: colori.bianco }]}>{t}</Text>
    </Pressable>
  );
}

export function RigaInterruttore({
  titolo,
  descrizione,
  valore,
  onCambia,
}: {
  titolo: string;
  descrizione?: string;
  valore: boolean;
  onCambia: (v: boolean) => void;
}) {
  return (
    <View style={st.riga}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={testo.sottotitolo}>{titolo}</Text>
        {descrizione ? <Text style={testo.soft}>{descrizione}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={titolo}
        value={valore}
        onValueChange={onCambia}
        trackColor={{ true: colori.accento, false: colori.bordo }}
        thumbColor={colori.superficie}
      />
    </View>
  );
}

export function Casella({
  fatto,
  testo: t,
  sotto,
  onPress,
  onLungo,
}: {
  fatto: boolean;
  testo: string;
  sotto?: string;
  onPress: () => void;
  onLungo?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: fatto }}
      accessibilityLabel={t}
      onPress={onPress}
      onLongPress={onLungo}
      style={st.casella}
    >
      <Ionicons
        name={fatto ? "checkmark-circle" : "ellipse-outline"}
        size={30}
        color={fatto ? colori.successo : colori.testoTenue}
      />
      <View style={{ flex: 1 }}>
        <Text style={[testo.corpo, fatto && st.barrato]}>{t}</Text>
        {sotto ? <Text style={testo.piccolo}>{sotto}</Text> : null}
      </View>
    </Pressable>
  );
}

export function Vuoto({ icona, titolo, testo: t }: { icona: IconName; titolo: string; testo: string }) {
  return (
    <View style={st.vuoto}>
      <Ionicons name={icona} size={40} color={colori.accentoScuro} />
      <Text style={[testo.sottotitolo, { textAlign: "center" }]}>{titolo}</Text>
      <Text style={[testo.soft, { textAlign: "center" }]}>{t}</Text>
    </View>
  );
}

export function Avviso({ children }: { children: ReactNode }) {
  return (
    <View style={st.avviso} accessibilityLiveRegion="polite">
      <Ionicons name="information-circle-outline" size={20} color={colori.accentoScuro} />
      <Text style={[testo.soft, { flex: 1 }]}>{children}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.sfondo },
  contenuto: { padding: spazi.xl, gap: spazi.l, paddingBottom: 48 },
  bottone: {
    minHeight: 54,
    borderRadius: raggi.pillola,
    paddingHorizontal: spazi.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spazi.s,
  },
  bottoneTesto: { fontSize: 17, fontWeight: "700" },
  scheda: {
    backgroundColor: colori.superficie,
    borderRadius: raggi.l,
    borderWidth: 1,
    borderColor: colori.bordo,
    padding: spazi.l,
    gap: spazi.m,
  },
  chip: {
    paddingHorizontal: spazi.l,
    minHeight: 44,
    justifyContent: "center",
    borderRadius: raggi.pillola,
    borderWidth: 1.5,
    borderColor: colori.bordo,
    backgroundColor: colori.superficie,
  },
  chipAttivo: { backgroundColor: colori.inchiostro, borderColor: colori.inchiostro },
  chipTesto: { fontSize: 16, fontWeight: "600", color: colori.inchiostro },
  riga: { flexDirection: "row", alignItems: "center", gap: spazi.m, minHeight: 56 },
  casella: { flexDirection: "row", alignItems: "center", gap: spazi.m, minHeight: 52, paddingVertical: 6 },
  barrato: { textDecorationLine: "line-through", color: colori.testoTenue },
  vuoto: { alignItems: "center", gap: spazi.s, paddingVertical: spazi.xxl, paddingHorizontal: spazi.l },
  avviso: {
    flexDirection: "row",
    gap: spazi.s,
    alignItems: "flex-start",
    backgroundColor: colori.superficieAlta,
    borderRadius: raggi.m,
    padding: spazi.m,
  },
});
