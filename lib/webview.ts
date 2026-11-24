// Detección de navegadores internos (WhatsApp, Instagram, Facebook, TikTok…). Ahí Google bloquea el login
// (`disallowed_useragent`) y los popups fallan. Sirve en cliente (navigator.userAgent) y en servidor (header).

export type InAppBrowser = "whatsapp" | "instagram" | "facebook" | "messenger" | "tiktok" | "snapchat" | "line" | "wechat" | "linkedin" | "twitter" | "webview";

const APPS: [InAppBrowser, RegExp][] = [
  ["whatsapp", /WhatsApp/i],
  ["instagram", /Instagram/i],
  ["messenger", /\bMessenger|FB_IAB\/MESSENGER|FBAN\/Messenger/i],
  ["facebook", /FBAN|FBAV|FB_IAB|FBIOS|FB4A/i],
  ["tiktok", /musical_ly|Bytedance|TikTok|BytedanceWebview/i],
  ["snapchat", /Snapchat/i],
  ["line", /\bLine\//i],
  ["wechat", /MicroMessenger/i],
  ["linkedin", /LinkedInApp/i],
  ["twitter", /Twitter(?:Android)?\b/i],
];

/** Qué navegador interno es, o null si es un navegador normal (Safari, Chrome, Firefox…). */
export function inAppBrowser(userAgent: string | null | undefined): InAppBrowser | null {
  const ua = userAgent ?? "";
  if (!ua) return null;
  for (const [name, re] of APPS) if (re.test(ua)) return name;
  // WebView genérico de Android: "; wv)" en el UA.
  if (/Android/i.test(ua) && /;\s*wv\)/i.test(ua)) return "webview";
  // WebView de iOS: WebKit de iPhone/iPad sin "Safari/" (y que no sea Chrome/Firefox/Edge de iOS).
  if (/(iPhone|iPod|iPad)/i.test(ua) && /AppleWebKit/i.test(ua) && !/Safari\//i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)) return "webview";
  return null;
}

export function isInAppBrowser(userAgent: string | null | undefined): boolean {
  return inAppBrowser(userAgent) !== null;
}
