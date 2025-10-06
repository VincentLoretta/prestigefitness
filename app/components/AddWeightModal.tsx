// components/AddWeightModal.tsx
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, parse } from "date-fns";
import * as React from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  defaultDate: string;                                  // "yyyy-MM-dd"
  defaultWeight?: number;                               // prefill when editing
  onSave: (date: string, weight: number) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;                // show Delete if present
  title?: string;
  unit?: "lb" | "kg";
  mode?: "add" | "edit";
};

function toLocalDateFromYMD(ymd: string) {
  const d = parse(ymd, "yyyy-MM-dd", new Date());
  return isNaN(+d) ? new Date() : d;
}
function toYMD(d: Date) {
  return format(d, "yyyy-MM-dd");
}

const AddWeightModal: React.FC<Props> = ({
  visible,
  onClose,
  defaultDate,
  defaultWeight,
  onSave,
  onDelete,
  title = "Add Weight",
  unit = "lb",
  mode = "add",
}) => {
  const [val, setVal] = React.useState<string>(defaultWeight != null ? String(defaultWeight) : "");
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const [dateStr, setDateStr] = React.useState<string>(defaultDate);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setVal(defaultWeight != null ? String(defaultWeight) : "");
      setDateStr(defaultDate);
    }
  }, [visible, defaultWeight, defaultDate]);

  const handleSave = async () => {
    const n = Number(val);
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert("Invalid weight", "Enter a positive number.");
      return;
    }
    setSaving(true);
    try {
      await onSave(dateStr, n);
      onClose();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (e: any) {
      Alert.alert("Delete failed", e?.message ?? String(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal visible={!!visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={s.wrap}
      >
        <View style={s.sheet}>
          <Text style={s.title}>{onDelete ? "Edit Weight" : title}</Text>

          <View style={s.dateRow}>
            <Text style={s.meta}>Date: {format(toLocalDateFromYMD(dateStr), "EEE, MMM d, yyyy")}</Text>
            <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={() => setPickerOpen(true)}>
              <Text style={s.btnGhostText}>Change</Text>
            </TouchableOpacity>
          </View>

          {pickerOpen && (
            <DateTimePicker
              mode="date"
              value={toLocalDateFromYMD(dateStr)}
              onChange={(_, d) => {
                setPickerOpen(false);
                if (d) setDateStr(toYMD(d));
              }}
            />
          )}

          <Text style={s.label}>Weight ({unit})</Text>
          <TextInput
            value={val}
            onChangeText={setVal}
            keyboardType="numeric"
            placeholder={unit === "lb" ? "e.g., 175" : "e.g., 79.4"}
            placeholderTextColor="#6B7280"
            style={s.input}
            returnKeyType="done"
          />

          <View style={s.actionsRow}>
            {onDelete ? (
              <TouchableOpacity
                style={[s.btn, s.btnDanger]}
                onPress={handleDelete}
                disabled={saving || deleting}
              >
                {deleting ? <ActivityIndicator /> : <Text style={s.btnDangerText}>Delete</Text>}
              </TouchableOpacity>
            ) : null}
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={onClose} disabled={saving || deleting}>
              <Text style={s.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.btnPrimary]}
              onPress={handleSave}
              disabled={saving || deleting}
            >
              {saving ? <ActivityIndicator /> : <Text style={s.btnPrimaryText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AddWeightModal;

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#0B0F1A",
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  title: { color: "white", fontSize: 18, fontWeight: "800" },
  meta: { color: "#9AA4B2", marginTop: 4, marginBottom: 12 },
  label: { color: "#9AA4B2", fontSize: 12, marginTop: 8, marginBottom: 4 },
  input: {
    backgroundColor: "#111827",
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  actionsRow: { flexDirection: "row", alignItems: "center", marginTop: 16, gap: 8 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  btnGhost: { borderWidth: 1, borderColor: "#374151" },
  btnGhostText: { color: "#CBD5E1", fontWeight: "800" },

  btnPrimary: { backgroundColor: "#FFD166" },
  btnPrimaryText: { color: "#0B0F1A", fontWeight: "900" },

  btnDanger: { backgroundColor: "#3F1D1D", borderWidth: 1, borderColor: "#7F1D1D" },
  btnDangerText: { color: "#FCA5A5", fontWeight: "800" },
});
