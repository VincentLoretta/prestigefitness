import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "src/context/AuthContext"; // ✅ use @ alias
import { probeAppwritePublic } from "src/services/appwriteProbe"; // ✅ use @ alias

export default function AuthLayout() {
  // sanity log to prove this file rendered
  console.log("[AuthLayout] mounted");

  const { user, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log("[AuthLayout] authLoading:", authLoading, "user:", !!user);
    if (!authLoading && user) {
      router.replace("/(tabs)");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const ep = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
    const proj = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
    console.log("ENV endpoint:", ep);
    console.log("ENV project:", proj);

    if (!ep) {
      console.warn("Missing EXPO_PUBLIC_APPWRITE_ENDPOINT");
      return;
    }
    probeAppwritePublic(ep).then((ok) => {
      console.log("Appwrite public probe:", ok ? "reachable ✅" : "unreachable ❌");
    });
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
