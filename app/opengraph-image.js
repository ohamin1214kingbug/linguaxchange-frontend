import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "LinguaXchange — Learn by teaching, teach by learning.";

const mascot = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public/icons/icon-512.png"),
).toString("base64")}`;

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 72,
          padding: 80,
          backgroundColor: "#fdf3e7",
        }}
      >
        <img src={mascot} width={340} height={340} style={{ borderRadius: 76 }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 84,
              fontWeight: 800,
              letterSpacing: -2,
              color: "#1a1a2e",
            }}
          >
            <span>Lingua</span>
            <span style={{ color: "#e0263a" }}>Xchange</span>
          </div>
          <div style={{ marginTop: 18, fontSize: 38, color: "#5a5a6e" }}>
            Learn by teaching, teach by learning.
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 44,
              padding: "16px 32px",
              borderRadius: 999,
              backgroundColor: "#e0263a",
              fontSize: 27,
              fontWeight: 700,
              color: "#fdf3e7",
            }}
          >
            Small group classes · No subscriptions
          </div>
        </div>
      </div>
    ),
    size,
  );
}
