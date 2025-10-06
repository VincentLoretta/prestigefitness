// app/+not-found.tsx
import { Link, Stack } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={s.container}>
        <Text style={s.title}>This screen doesn’t exist.</Text>

        <Link href="/" asChild>
          <TouchableOpacity style={s.btn}>
            <Text style={s.btnText}>Go to Home</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0F1A",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  title: { color: "white", fontSize: 18, fontWeight: "800", marginBottom: 16 },
  btn: {
    backgroundColor: "#FFD166",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnText: { color: "#0B0F1A", fontWeight: "900" },
});
