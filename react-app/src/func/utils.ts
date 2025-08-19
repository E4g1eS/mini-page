import { createScopedLog, LogSeverity } from "./logging";

const log = createScopedLog("Util");

export function generateRandomString(length: number): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getTypedElementById<ElementType extends HTMLElement>(
  id: string,
  cnstrctr: new () => ElementType
): ElementType | null {
  const htmlElement = document.getElementById(id);
  if (!htmlElement) return null;
  if (!(htmlElement instanceof cnstrctr)) return null;
  return htmlElement;
}

export function getTypedElementsByClass<ElementType extends HTMLElement>(
  cls: string,
  cnstrctr: new () => ElementType
): ElementType | null {
  const htmlElements = document.getElementsByClassName(cls);
  
  if (htmlElements.length === 0)
      return null;

  if (htmlElements.length > 1)
    log(`Multiple elements with classname "${cls}" are present.`, LogSeverity.WARNING);

  const htmlElement = htmlElements[0];
  if (!(htmlElement instanceof cnstrctr)) return null;
  return htmlElement;
}
