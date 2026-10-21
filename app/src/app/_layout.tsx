import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { gestisciRisposta } from "../lib/azioni";
import { preparaNotifiche, programmaCheckin } from "../lib/reminders";
import { useIdratato, useStore } from "../lib/store";
import { colori } from "../theme";

export default function RootLayout() {
  const idratato = useIdratato();
  const gestite = useRef(new Set<string>());

  // Notifiche: canali, pulsanti, check-in giornalieri.
  useEffect(() => {
    if (!idratato) return;
    (async () => {
      await preparaNotifiche();
      const imp = useStore.getState().impostazioni;
      if (imp.onboardingFatto) await programmaCheckin(imp).catch(() => undefined);
    })().catch(() => undefined);
  }, [idratato]);

  // Tocchi e pulsanti sulle notifiche, anche quando l'app era chiusa.
  useEffect(() => {
    if (!idratato) return;
    const gestisci = async (r: Notifications.NotificationResponse | null) => {
      if (!r) return;
      const chiave = `${r.notification.request.identifier}:${r.actionIdentifier}:${r.notification.date}`;
      if (gestite.current.has(chiave)) return;
      gestite.current.add(chiave);
      const rotta = await gestisciRisposta(r);
      if (rotta) router.push(rotta as never);
      await Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    };
    Notifications.getLastNotificationResponseAsync().then(gestisci).catch(() => undefined);
    const sub = Notifications.addNotificationResponseReceivedListener((r) => void gestisci(r));
    return () => sub.remove();
  }, [idratato]);

  if (!idratato) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colori.sfondo }}>
        <ActivityIndicator color={colori.accentoScuro} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colori.sfondo },
          headerTintColor: colori.inchiostro,
          headerShadowVisible: false,
          headerBackTitle: "Indietro",
          contentStyle: { backgroundColor: colori.sfondo },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="benvenuto" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="compito/[id]" options={{ title: "Compito" }} />
        <Stack.Screen name="focus/[id]" options={{ title: "Un passo alla volta", presentation: "fullScreenModal" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
