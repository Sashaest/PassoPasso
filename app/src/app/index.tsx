import { Redirect } from "expo-router";
import { useStore } from "../lib/store";

export default function Avvio() {
  const fatto = useStore((s) => s.impostazioni.onboardingFatto);
  return <Redirect href={fatto ? "/oggi" : "/benvenuto"} />;
}
