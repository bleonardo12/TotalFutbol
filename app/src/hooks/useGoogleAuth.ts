import * as Google from "expo-auth-session/providers/google";
import { useEffect } from "react";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

/**
 * Google Sign-In (docs Google, decisiones-produccion): NO crea cuentas nuevas por si solo -- el
 * telefono sigue siendo el ancla de identidad obligatoria. Se usa tanto para loguearse rapido
 * (login.tsx, cuenta ya vinculada) como para vincular (perfil.tsx, con sesion ya iniciada).
 *
 * Necesita EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID y EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en .env --
 * mientras no esten seteadas, `disponible` da false y el boton que use este hook se deshabilita
 * solo, sin romper nada (ver GOOGLE_CLIENT_ID pendiente del lado del backend tambien).
 */
export function useGoogleAuth(onIdToken: (idToken: string) => void) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: ["openid", "profile", "email"],
  });

  useEffect(() => {
    if (response?.type === "success" && response.params.id_token) {
      onIdToken(response.params.id_token);
    }
  }, [response, onIdToken]);

  return {
    disponible: !!request,
    iniciar: () => promptAsync(),
  };
}
