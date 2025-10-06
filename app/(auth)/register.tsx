// app/(auth)/register.tsx
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "src/context/AuthContext";

export default function RegisterScreen() {
  const router = useRouter();
  const { register, authLoading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  async function onSubmit() {
    Keyboard.dismiss();

    // very light client-side validation
    if (!name.trim()) return Alert.alert("Missing name", "Please enter your name.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      return Alert.alert("Invalid email", "Please enter a valid email address.");
    if (password.length < 6)
      return Alert.alert("Weak password", "Password must be at least 6 characters.");
    if (password !== confirm)
      return Alert.alert("Passwords don’t match", "Please retype your password.");

    try {
      await register(name.trim(), email.trim(), password);
      // If register() succeeds, AuthContext will log you in and load profile.
      router.replace("/(tabs)");
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      Alert.alert("Create account failed", msg);
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <View style={s.header}>
          <Text style={s.title}>Create your account</Text>
          <Text style={s.subtitle}>Track meals, XP, streaks & more.</Text>
        </View>

        <View style={s.form}>
          <Text style={s.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Jane Doe"
            placeholderTextColor="#6B7280"
            style={s.input}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Text style={s.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="jane@example.com"
            placeholderTextColor="#6B7280"
            style={s.input}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
          />

          <Text style={s.label}>Password</Text>
          <View style={s.pwRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#6B7280"
              style={[s.input, { flex: 1 }]}
              secureTextEntry={!showPw}
              autoCapitalize="none"
              returnKeyType="next"
            />
            <TouchableOpacity style={s.pwToggle} onPress={() => setShowPw(v => !v)}>
              <Text style={s.pwToggleText}>{showPw ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Confirm password</Text>
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            placeholder="••••••••"
            placeholderTextColor="#6B7280"
            style={s.input}
            secureTextEntry={!showPw}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={onSubmit}
          />

          <TouchableOpacity
            style={[s.btn, s.btnPrimary, { marginTop: 14 }]}
            onPress={onSubmit}
            disabled={authLoading}
          >
            <Text style={s.btnPrimaryText}>{authLoading ? "Creating…" : "Create account"}</Text>
          </TouchableOpacity>

          <View style={{ height: 12 }} />

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={[s.btn, s.btnGhost]}>
              <Text style={s.btnGhostText}>Already have an account? Log in</Text>
            </TouchableOpacity>
          </Link>

          <Text style={s.hint}>
            By creating an account you agree to our basic Terms. You can delete your data any time.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0F1A" },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { color: "white", fontWeight: "900", fontSize: 22 },
  subtitle: { color: "#9AA4B2", marginTop: 6 },

  form: { paddingHorizontal: 16, paddingTop: 8 },
  label: { color: "#9AA4B2", marginTop: 12, marginBottom: 6, fontSize: 12 },
  input: {
    backgroundColor: "#111827",
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  pwRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pwToggle: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#374151",
    backgroundColor: "#0F172A",
  },
  pwToggleText: { color: "#CBD5E1", fontWeight: "700" },

  btn: { paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  btnPrimary: { backgroundColor: "#FFD166" },
  btnPrimaryText: { color: "#0B0F1A", fontWeight: "900" },
  btnGhost: { borderWidth: 1, borderColor: "#374151" },
  btnGhostText: { color: "#CBD5E1", fontWeight: "700" },

  hint: { color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 12 },
});
