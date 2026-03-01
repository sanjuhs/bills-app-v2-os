import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f59e0b, #ec4899)",
          borderRadius: 8,
          color: "white",
          fontSize: 18,
          fontWeight: 900,
          letterSpacing: -1,
        }}
      >
        B
      </div>
    ),
    { ...size },
  )
}
