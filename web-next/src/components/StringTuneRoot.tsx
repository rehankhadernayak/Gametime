"use client";

import { useEffect } from "react";
import StringTune, { StringMagnetic, StringSplit } from "@fiddle-digital/string-tune";

function isCoarsePointerDevice(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia?.("(pointer: coarse)").matches) return true;
  if ((navigator.maxTouchPoints ?? 0) > 0) return true;
  return false;
}

/**
 * Boots StringTune once on viewports that use fine pointers (desktop mouse).
 * Smooth scroll is desktop-only; touch / coarse-pointer devices keep native scrolling.
 */
export function StringTuneRoot() {
  useEffect(() => {
    if (isCoarsePointerDevice()) return;

    const tune = StringTune.getInstance();
    tune.scrollDesktopMode = "smooth";
    tune.scrollMobileMode = "default";
    tune.use(StringMagnetic);
    tune.use(StringSplit);
    tune.start(60);

    return () => {
      tune.destroy();
    };
  }, []);

  return null;
}
