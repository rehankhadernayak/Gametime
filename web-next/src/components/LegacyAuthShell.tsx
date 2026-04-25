"use client";

import { useEffect, useState } from "react";
import { styles } from "@/styles/legacyAuth";

type LegacyAuthShellProps = {
  children: React.ReactNode;
};

function readInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem("gametime_theme");
  if (saved === "dark" || saved === "light") return saved;
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export function LegacyAuthShell({ children }: LegacyAuthShellProps) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    setTheme(readInitialTheme());
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "gametime_theme" && (e.newValue === "dark" || e.newValue === "light")) {
        setTheme(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div
      className={styles.legacyDashboardRoot}
      data-dashboard-legacy
      data-theme={theme}
    >
      {children}
    </div>
  );
}
