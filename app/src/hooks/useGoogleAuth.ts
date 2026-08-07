import { GoogleSignin, isErrorWithCode, statusCodes } from "@react-native-google-signin/google-signin";
import { useEffect } from "react";

let configurado = false;

function asegurarConfigurado(): void {
  if (configurado) return;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) return;
  GoogleSignin.configure({ webClientId });
  configurado = true;
}

/**
 * Google Sign-In (docs Google, decisiones-produccion): NO crea cuentas nuevas por si solo -- el
 * telefono sigue siendo el ancla de identidad obligatoria. Se usa tanto para loguearse rapido
 * (login.tsx, cuenta ya vinculada) como para vincular (perfil.tsx, con sesion ya iniciada).
 *
 * Usa el SDK nativo de Google Play Services (no expo-auth-session): Google bloqueo los redirects
 * por esquema custom en Android (invalid_request: "Custom URI scheme is not enabled"), asi que la
 * unica via soportada hoy es esta. Necesita EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en .env (el client ID
 * tipo Web -- el mismo que usa el backend para verificar audience) -- el client ID tipo Android no
 * se referencia desde JS, Play Services lo resuelve solo via package name + SHA-1 ya registrados
 * en Google Cloud Console.
 */
export function useGoogleAuth(onIdToken: (idToken: string) => void) {
  useEffect(() => {
    asegurarConfigurado();
  }, []);

  async function iniciar(): Promise<void> {
    asegurarConfigurado();
    try {
      await GoogleSignin.hasPlayServices();
      const respuesta = await GoogleSignin.signIn();
      if (respuesta.data?.idToken) {
        onIdToken(respuesta.data.idToken);
      }
    } catch (error) {
      // Cancelo el picker el usuario mismo -- no es un error real, no hay nada que mostrar.
      if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
      // El resto de errores del SDK nativo (Play Services desactualizado, etc.) se loguean --
      // el error real del backend (token invalido, etc.) lo sigue mostrando la mutacion que
      // llama a este hook, esto es solo para fallos previos a llegar a mandar el idToken.
      console.warn("Google Sign-In fallo:", error);
    }
  }

  return {
    disponible: !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iniciar,
  };
}
