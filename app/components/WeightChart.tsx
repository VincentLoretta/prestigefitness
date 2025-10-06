import * as React from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from "react-native-svg";

export type WeightPoint = { date: string; weight: number };


type Props = {
    data: WeightPoint[];
    height?: number;
    stroke?: string;
    
}

export default function WeightChart({data, height = 160, stroke = "#FFD166"}: Props) {
    const [width, setWidth] = React.useState(0);

    const P = { top: 8, right: 32, bottom: 16, left: 8};
    const innerW = Math.max(1, width - P.left - P.right);
    const innerH = Math.max(1, height - P.top - P.bottom);

    const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);


    const points = data.filter((d) => Number.isFinite(d.weight));
    const hasData = points.length > 1 && width > 0;

    const weights = points.map((p) => p.weight);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const pad = Math.max(0.5, (maxW - minW)* 0.1);
    const yMin = minW - pad;
    const yMax = maxW + pad;
    const yRange = Math.max(1, yMax - yMin);

    const x = (i: number) => (i/ (points.length -1)) * innerW + P.left;
    const y = (w: number) => P.top + (1 - (w-yMin) / yRange) * innerH;

    const pathD = hasData
    ? points
    .map((p,i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(p.weight).toFixed(2)}`)
    .join(" ")
    : "";

    const yTicks = [yMax, (yMax + yMin) / 2, yMin];

    return (
    <View style={{ height }} onLayout={onLayout}>
      {hasData ? (
        <>
          <Svg width="100%" height="100%">
            {/* grid lines */}
            {yTicks.map((val, idx) => (
              <Line
                key={idx}
                x1={P.left}
                x2={width - P.right}
                y1={y(val)}
                y2={y(val)}
                stroke="#1F2937"
                strokeWidth={1}
              />
            ))}

            {/* weight line */}
            <Path d={pathD} stroke={stroke} strokeWidth={3} fill="none" />

            {/* last point */}
            <Circle
              cx={x(points.length - 1)}
              cy={y(points[points.length - 1].weight)}
              r={4}
              fill={stroke}
            />
          </Svg>

          {/* right-side y labels */}
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { paddingRight: 6, justifyContent: "space-between" }]}
          >
            {yTicks.map((val, idx) => (
              <Text key={idx} style={styles.tickRight}>
                {val.toFixed(1)}
              </Text>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Not enough data yet</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tickRight: {
    position: "absolute",
    right: 0,
    color: "#9AA4B2",
    fontSize: 11,
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#6B7280" },
});


    
    
