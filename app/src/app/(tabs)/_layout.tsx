import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTema } from "@/theme";

/** Marca CABRA como header propio, arriba de todo (no arriba de la tab bar -- feedback de
 * Leonardo tras ver la version anterior: mas arriba y mas grande). Reemplaza el header nativo
 * de Expo Router (que solo repetia el nombre de la pestaña, ya visible en el tab bar de abajo). */
function HeaderMarca(): React.JSX.Element {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top + 10,
        paddingBottom: 12,
        backgroundColor: colores.barra,
        borderBottomWidth: 1,
        borderBottomColor: colores.bordeSutil,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontFamily: "Archivo_900Black",
          fontSize: 30,
          letterSpacing: 2,
          color: colores.oro,
        }}
      >
        CABRA
      </Text>
      <Text
        style={{
          fontFamily: "Archivo_700Bold",
          fontSize: 11,
          letterSpacing: 0.8,
          color: colores.textoSecundario,
          marginTop: 1,
        }}
      >
        Demostrá que sos el GOAT 🐐
      </Text>
    </View>
  );
}

export default function TabsLayout(): React.JSX.Element {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        header: () => <HeaderMarca />,
        tabBarStyle: {
          backgroundColor: colores.barra,
          borderTopColor: colores.bordeSutil,
          height: 56 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: colores.acento,
        tabBarInactiveTintColor: colores.textoApagado,
        tabBarLabelStyle: { fontFamily: "Archivo_600SemiBold", fontSize: 10 },
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
