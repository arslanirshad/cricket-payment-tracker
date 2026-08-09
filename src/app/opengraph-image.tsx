import { ImageResponse } from "next/og";

export const alt = "Cricket Dues Tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0f766e 0%, #0d9488 45%, #134e4a 100%)",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 48,
            marginBottom: 48,
          }}
        >
          {/* Bat */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 36,
                height: 70,
                borderRadius: 10,
                background: "#5c4033",
                marginBottom: -4,
              }}
            />
            <div
              style={{
                width: 92,
                height: 220,
                borderRadius: "18px 18px 28px 28px",
                background: "#d4a574",
              }}
            />
          </div>
          {/* Ball */}
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: 80,
              background: "#c41e3a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              marginTop: 40,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 42,
                top: 18,
                width: 10,
                height: 124,
                borderRadius: 5,
                background: "#f8fafc",
                transform: "rotate(-10deg)",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 42,
                top: 18,
                width: 10,
                height: 124,
                borderRadius: 5,
                background: "#f8fafc",
                transform: "rotate(10deg)",
              }}
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: -1,
          }}
        >
          Cricket Dues Tracker
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 16,
            fontSize: 32,
            color: "#ccfbf1",
          }}
        >
          Match fees — unpaid and paid at a glance
        </div>
      </div>
    ),
    { ...size }
  );
}
