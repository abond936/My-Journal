"use client";

import styles from "./PaletteTest.module.css";

const palette = [
  { name: "Rust/Brick", hex: "#AA4512" },
  { name: "Teal/Blue", hex: "#124E66" },
  { name: "Green", hex: "#387127" },
  { name: "Plum/Purple", hex: "#702763" },
  { name: "Brown", hex: "#826233" },
  { name: "Gold", hex: "#D4A24C" },
];

export default function PaletteTestPage() {
  return (
    <div className={styles.container}>
      <h1>Custom Color Palette Test</h1>
      <div className={styles.swatchGrid}>
        {palette.map(({ name, hex }) => (
          <div key={hex} className={styles.swatchBlock}>
            <div className={styles.swatch} style={{ backgroundColor: hex }} />
            <div className={styles.info}>
              <span className={styles.name}>{name}</span>
              <span className={styles.hex}>{hex}</span>
            </div>
            <div className={styles.tagRow}>
              <span
                className={styles.tag}
                style={{ backgroundColor: hex, color: "#fff", border: `2px solid ${hex}` }}
              >
                Tag (bg)
              </span>
              <span
                className={styles.tag}
                style={{ backgroundColor: "transparent", color: hex, border: `2px solid ${hex}` }}
              >
                Tag (border)
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className={styles.note}>
        Switch your site theme to see how these colors look in both light and dark mode.
      </p>
    </div>
  );
} 