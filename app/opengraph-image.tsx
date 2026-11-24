import { ImageResponse } from "next/og";
import { COLORS, OG_SIZE, OgBrand, OgFrame, ogArt } from "./_og/card";

export const alt = "givegifts: Regalitos cargando un regalo gigante. Tu intercambio de regalos, sin enredos.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const art = await ogArt("regalitos");
  return new ImageResponse(
    (
      <OgFrame background={COLORS.pasto}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 560, height: "100%" }}>
          <OgBrand />
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ display: "flex", flexDirection: "column", fontSize: 84, lineHeight: 0.95, letterSpacing: "-0.05em" }}>
              <span>Tu intercambio</span>
              <span>de regalos,</span>
              <span>sin enredos.</span>
            </div>
            <span style={{ fontSize: 30, letterSpacing: "-0.02em", lineHeight: 1.2 }}>Sorteo secreto, listas de deseos y buzón anónimo con un solo link.</span>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={art} width={560} height={447} style={{ position: "absolute", right: 40, bottom: 70 }} />
      </OgFrame>
    ),
    { ...size },
  );
}
