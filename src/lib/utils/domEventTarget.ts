/**
 * Pointer/click targets can be a Text node (e.g. inside a span). `Element#closest`
 * is not available on Text — resolve to a parent element before calling `closest`.
 */
export function eventTargetToElement(target: EventTarget | null): Element | null {
  if (target == null) return null;
  if (target instanceof Element) return target;
  if (target instanceof Text) return target.parentElement;
  return null;
}
