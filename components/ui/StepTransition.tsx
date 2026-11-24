"use client";

import { addTransitionType, startTransition, useCallback, ViewTransition, type ReactNode } from "react";

export type StepDirection = "adelante" | "atras";

/**
 * Cambia de paso dentro de una transición con tipo, para que <StepTransition> deslice en la dirección correcta.
 *   const go = useStepGo();
 *   go("adelante", () => setStep(step + 1));
 */
export function useStepGo() {
  return useCallback((direction: StepDirection, update: () => void) => {
    startTransition(() => {
      addTransitionType(direction === "adelante" ? "paso-adelante" : "paso-atras");
      update();
    });
  }, []);
}

/**
 * Contenido de un paso del wizard. Cambia `stepKey` (vía `useStepGo`) y el paso viejo sale por un lado
 * y el nuevo entra por el otro. Sin soporte de View Transitions, el cambio es instantáneo.
 */
export function StepTransition({ stepKey, children }: { stepKey: string | number; children: ReactNode }) {
  return (
    <ViewTransition
      key={stepKey}
      enter={{ "paso-adelante": "paso-adelante", "paso-atras": "paso-atras", default: "none" }}
      exit={{ "paso-adelante": "paso-adelante", "paso-atras": "paso-atras", default: "none" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
