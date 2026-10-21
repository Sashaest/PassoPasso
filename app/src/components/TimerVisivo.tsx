import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { formatTimer } from "../lib/time";
import { colori } from "../theme";

/**
 * Timer visivo: il tempo che resta è un "disco" che si svuota.
 * Rende il tempo visibile (utile quando lo si percepisce male).
 */
export function TimerVisivo({
  totaleSec,
  restantiSec,
  dimensione = 260,
}: {
  totaleSec: number;
  restantiSec: number;
  dimensione?: number;
}) {
  const spessore = dimensione * 0.12;
  const r = (dimensione - spessore) / 2;
  const circ = 2 * Math.PI * r;
  const frazione = totaleSec > 0 ? Math.max(0, Math.min(1, restantiSec / totaleSec)) : 0;
  const finito = restantiSec <= 0;

  return (
    <View
      style={{ width: dimensione, height: dimensione, alignItems: "center", justifyContent: "center" }}
      accessible
      accessibilityRole="timer"
      accessibilityLabel={
        finito ? "Tempo finito" : `Restano ${Math.ceil(restantiSec / 60)} minuti`
      }
    >
      <Svg width={dimensione} height={dimensione} style={{ position: "absolute" }}>
        <Circle cx={dimensione / 2} cy={dimensione / 2} r={r} stroke={colori.superficieAlta} strokeWidth={spessore} fill="none" />
        <Circle
          cx={dimensione / 2}
          cy={dimensione / 2}
          r={r}
          stroke={finito ? colori.successo : colori.accento}
          strokeWidth={spessore}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - frazione)}
          strokeLinecap="round"
          transform={`rotate(-90 ${dimensione / 2} ${dimensione / 2})`}
        />
      </Svg>
      <Text style={{ fontSize: dimensione * 0.2, fontWeight: "700", color: colori.inchiostro, fontVariant: ["tabular-nums"] }}>
        {finito ? "Fatto?" : formatTimer(restantiSec)}
      </Text>
    </View>
  );
}
