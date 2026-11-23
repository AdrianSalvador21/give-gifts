"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Hace entrar su contenido una sola vez, al aparecer en pantalla. Si vuelves a subir, ya no se oculta. */
export function RevealOnce({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-shown={shown} className={`gg-reveal ${className}`}>
      {children}
    </div>
  );
}
