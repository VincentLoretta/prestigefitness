// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { ActivityIndicator, Text, View, useColorScheme } from "react-native";
import { AuthProvider, useAuth } from "src/context/AuthContext";

function RootNavigator() {
  const { user, authReady } = useAuth();

  if (!authReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0B0F1A" }}>
        <ActivityIndicator />
        <Text style={{ color: "#fff", marginTop: 8 }}>Loading…</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {user ? <Stack.Screen name="(tabs)" /> : <Stack.Screen name="(auth)" />}
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function Layout() {
  const scheme = useColorScheme();
  return (
    <AuthProvider>
      <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
        <RootNavigator />
      </ThemeProvider>
    </AuthProvider>
  );
}
