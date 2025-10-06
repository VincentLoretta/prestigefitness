// components/XpBar.tsx
import * as React from "react";
import { StyleSheet, Text, View } from "react-native";

// Adjust this import path if your project structure is different
import { levelCapFor, MAX_PRESTIGE, xpProgress } from "../../src/lib/xp";

type Props = {
  level: number;        // current level (>=1)
  xp: number;           // xp into current level (not total XP)
  prestige?: number;    // 0..MAX_PRESTIGE
};

export default function XpBar({ level, xp, prestige = 0 }: Props) {
  const cap = levelCapFor(prestige);
  const isAtCap = level >= cap;

  // If at cap, force 100% fill; otherwise use xpProgress
  const { current, needed, pct } = isAtCap
    ? { current: 1, needed: 1, pct: 1 }
    : xpProgress(level, xp);

  const percent = Number.isFinite(pct) ? Math.max(0, Math.min(1, pct)) : 0;

  return (
    <View style={s.wrap}>
      {/* Top row: Level and prestige */}
      <View style={s.row}>
        <Text style={s.levelText}>
          Lv {level}
          <Text style={s.dim}> / {cap}</Text>
        </Text>

        <Text style={s.prestige}>
          {renderStars(prestige)}{" "}
          <Text style={s.dim}>
            ({prestige}/{MAX_PRESTIGE})
          </Text>
        </Text>
      </View>

      {/* Bar */}
      <View style={s.barOuter}>
        <View style={[s.barInner, { width: `${percent * 100}%` }]} />
      </View>

      {/* Bottom row: numeric */}
      <View style={s.row}>
        <Text style={s.dim}>
          {isAtCap ? "Level cap reached" : `${current} / ${needed} XP`}
        </Text>
        {!isAtCap && <Text style={s.dim}>{Math.round(percent * 100)}%</Text>}
      </View>
    </View>
  );
}

function renderStars(n: number) {
  if (!n || n <= 0) return "☆";
  // max 5 glyphs so it doesn't get too wide visually
  const clamped = Math.min(n, 5);
  return "★".repeat(clamped) + (clamped < n ? "+" : "");
}

const s = StyleSheet.create({
  wrap: {
    paddingVertical: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  levelText: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
  },
  prestige: {
    color: "#FFD166",
    fontWeight: "800",
  },
  dim: {
    color: "#9AA4B2",
    fontWeight: "600",
  },
  barOuter: {
    height: 10,
    backgroundColor: "#0F172A",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  barInner: {
    height: "100%",
    backgroundColor: "#FFD166",
  },
});
