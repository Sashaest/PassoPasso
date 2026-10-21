import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router/js-tabs";
import { colori } from "../../theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colori.accentoScuro,
        tabBarInactiveTintColor: colori.testoTenue,
        tabBarStyle: { backgroundColor: colori.superficie, borderTopColor: colori.bordo, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 13, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="oggi"
        options={{
          title: "Oggi",
          tabBarIcon: ({ color, size }) => <Ionicons name="today-outline" color={String(color)} size={size} />,
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: "Check-in",
          tabBarIcon: ({ color, size }) => <Ionicons name="sunny-outline" color={String(color)} size={size} />,
        }}
      />
      <Tabs.Screen
        name="impostazioni"
        options={{
          title: "Impostazioni",
          tabBarIcon: ({ color, size }) => <Ionicons name="options-outline" color={String(color)} size={size} />,
        }}
      />
    </Tabs>
  );
}
