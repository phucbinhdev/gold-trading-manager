"use client";

import { useCallback, useEffect } from "react";
import { useWebHaptics } from "web-haptics/react";

type HapticPreset =
  | "success"
  | "warning"
  | "error"
  | "light"
  | "medium"
  | "heavy"
  | "soft"
  | "rigid"
  | "selection"
  | "nudge"
  | "buzz";

const hapticAttribute = "data-haptic";

function getPreset(target: HTMLElement): HapticPreset | null {
  const value = target.getAttribute(hapticAttribute);

  if (value === "off") return null;
  if (value) return value as HapticPreset;

  if (target.closest("nav")) return "selection";
  if (target.getAttribute("data-variant") === "destructive") return "warning";
  if (target.getAttribute("role") === "switch") return "selection";

  return "light";
}

export function HapticFeedback() {
  const haptics = useWebHaptics();

  const trigger = useCallback(
    (preset: HapticPreset) => {
      void haptics.trigger(preset);
    },
    [haptics],
  );

  useEffect(() => {
    const handlePointerUp = (event: PointerEvent) => {
      if (event.defaultPrevented) return;

      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const interactive = target.closest<HTMLElement>(
        `[${hapticAttribute}], button, a[href], [role="button"], [role="switch"], [data-radix-collection-item]`,
      );

      if (!interactive) return;
      if (interactive.hasAttribute("disabled")) return;
      if (interactive.getAttribute("aria-disabled") === "true") return;

      const preset = getPreset(interactive);
      if (preset) trigger(preset);
    };

    document.addEventListener("pointerup", handlePointerUp, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("pointerup", handlePointerUp, {
        capture: true,
      });
    };
  }, [trigger]);

  return null;
}
