import { ImageResponse } from "next/og";
import { COLORS, OG_SIZE, OgBrand, OgFrame, ogArt } from "@/app/_og/card";
import { getExchangeByInvite, getOwnerName } from "@/lib/data/exchanges";
import { formatEvent, formatMoney } from "@/lib/format";

// Sólo datos que ya muestra la invitación pública: quién invita, nombre, fecha y presupuesto.
// Nunca lugar, mensaje ni participantes. Los links personales (/p/[token]) no usan esta imagen.

export const alt = "Invitación a un intercambio de regalos en givegifts";
export const size = OG_SIZE;
export const contentType = "image/png";

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "16px 24px", borderRadius: 18, background: "white" }}>
      <span style={{ fontSize: 22, color: COLORS.gris }}>{label}</span>
      <span style={{ fontSize: 34, letterSpacing: "-0.02em" }}>{value}</span>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = await params;
  const [art, exchange] = await Promise.all([ogArt("invitar"), getExchangeByInvite(inviteCode)]);
  const owner = exchange ? clip(await getOwnerName(exchange), 28) : "";

  return new ImageResponse(
    (
      <OgFrame background={COLORS.crema}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 700, height: "100%" }}>
          <OgBrand />
          {exchange ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ fontSize: 34, color: COLORS.gris }}>{owner ? `${owner} te invita a` : "Te invitan a"}</span>
                <span style={{ fontSize: exchange.name.length > 28 ? 64 : 80, lineHeight: 1, letterSpacing: "-0.05em" }}>{clip(exchange.name, 60)}</span>
              </div>
              <div style={{ display: "flex", gap: 14 }}>
                <Fact label="Cuándo" value={formatEvent(exchange.eventAt)} />
                <Fact label="Regalo de hasta" value={formatMoney(exchange.budget.amount)} />
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", fontSize: 76, lineHeight: 1, letterSpacing: "-0.05em" }}>
              <span>Te invitaron a un</span>
              <span>intercambio de regalos</span>
            </div>
          )}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={art} width={440} height={319} style={{ position: "absolute", right: 48, bottom: 150 }} />
        <div style={{ position: "absolute", right: 64, bottom: 56, display: "flex", padding: "14px 26px", borderRadius: 14, background: COLORS.pasto, fontSize: 28 }}>
          Apúntate con tu nombre →
        </div>
      </OgFrame>
    ),
    { ...size },
  );
}
