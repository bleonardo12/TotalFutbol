import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { TIPOGRAFIA, useTema } from "@/theme";

/** Alto de la franja de marca arriba de los iconos -- el nombre del producto no aparecia en
 * ninguna pantalla salvo login; esta es la unica franja que cubre las 5 pestanas principales. */
const ALTO_FRANJA_MARCA = 26;

export default function TabsLayout(): React.JSX.Element {
  const { colores } = useTema();

  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: colores.superficie },
        headerTintColor: colores.textoPrimario,
        headerTitleStyle: {
          color: colores.textoPrimario,
          fontFamily: TIPOGRAFIA.subtitulo.fontFamily,
          fontSize: 18,
        },
        tabBarStyle: {
          borderTopColor: colores.bordeSutil,
          height: 78,
          paddingTop: ALTO_FRANJA_MARCA,
          paddingBottom: 8,
        },
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: colores.barra }}>
            <View
              style={{
                height: ALTO_FRANJA_MARCA,
                alignItems: "center",
                justifyContent: "center",
                borderBottomWidth: 1,
                borderBottomColor: colores.bordeSutil,
              }}
            >
              <Text
                style={{
                  fontFamily: "Archivo_900Black",
                  fontSize: 11,
                  letterSpacing: 1.5,
                  color: colores.acento,
                }}
              >
                GUAPO
              </Text>
            </View>
          </View>
        ),
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
