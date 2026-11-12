import { withOptOut } from "../messaging/sms";

/**
 * How a text will be billed, counted with the STOP line added: GSM-7
 * text is 160 characters a message (153 each when split); any other
 * character makes the whole text 70 (67). Pure, so the composer can
 * show it as the owner types.
 */
const NOT_GSM = /[^\n\r\x20-\x7E£¥èéùìòÇØøÅå_ÆæßÉ¡ÄÖÑÜ§¿äöñüà€]/;

export function smsParts(body: string): { chars: number; parts: number; unicode: boolean } {
  const full = body.trim() ? withOptOut(body) : "";
  const unicode = NOT_GSM.test(full);
  const chars = [...full].length;
  const [one, many] = unicode ? [70, 67] : [160, 153];
  return { chars, parts: chars === 0 ? 0 : chars <= one ? 1 : Math.ceil(chars / many), unicode };
}
