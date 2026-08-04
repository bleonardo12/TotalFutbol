import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/auth-store";

export default function Index(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  return <Redirect href={accessToken ? "/inicio" : "/login"} />;
}
