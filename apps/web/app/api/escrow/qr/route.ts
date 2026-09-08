import QRCode from "qrcode";

/** Renders the doorstep QR for a delivery code as SVG — what the courier scans (ADR-0009). */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) return Response.json({ error: "A delivery code is required." }, { status: 400 });
  const svg = await QRCode.toString(code, { type: "svg", margin: 1, width: 180, color: { dark: "#173d37", light: "#fffefa" } });
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "Cache-Control": "no-store" } });
}
