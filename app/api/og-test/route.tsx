// app/api/og-test/route.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#3b82f6",
          fontSize: "60px",
          color: "white",
          fontWeight: "bold",
        }}
      >
        OG Image Test - Working! ✓
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
