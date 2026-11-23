"use client";

import { useEffect } from "react";

export const MY_EXCHANGES_KEY = "gg:mis-intercambios:v1";

export type DeviceEntry = { inviteCode: string; token: string; exchangeName: string };

export function readDeviceEntries(): DeviceEntry[] {
  try {
    const raw = localStorage.getItem(MY_EXCHANGES_KEY);
    const list = raw ? (JSON.parse(raw) as DeviceEntry[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Guarda en este navegador el link personal, para listarlo en «Mis intercambios». */
export function RememberDevice({ entry }: { entry: DeviceEntry }) {
  useEffect(() => {
    try {
      const list = readDeviceEntries().filter((e) => e.token !== entry.token);
      list.unshift(entry);
      localStorage.setItem(MY_EXCHANGES_KEY, JSON.stringify(list.slice(0, 30)));
    } catch {
      // Sin almacenamiento (modo privado): la página funciona igual.
    }
  }, [entry]);
  return null;
}
