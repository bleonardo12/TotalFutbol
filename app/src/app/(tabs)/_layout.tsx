import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useTema } from "@/theme";

export default function TabsLayout(): React.JSX.Element {
  const { colores } = useTema();

  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: colores.superficie },
        headerTintColor: colores.textoPrimario,
        headerTitleStyle: { color: colores.textoPrimario },
        tabBarStyle: { backgroundColor: colores.superficie, borderTopColor: colores.borde },
        tabBarActiveTintColor: colores.acento,
        tabBarInactiveTintColor: colores.textoApagado,
      }}
    >
      <Tabs.Screen
        name="inicio"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: "Ranking",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="podium" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="desafios"
        options={{
          title: "Desafios",
          tabBarIcon: ({ color, size }) => <Ionicons name="flash" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="partidos"
        options={{
          title: "Partidos",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="football" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
