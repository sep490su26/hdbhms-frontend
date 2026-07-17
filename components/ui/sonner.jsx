"use client"

import { useEffect, useState } from "react"
import { Toaster as Sonner } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const THEME_STORAGE_KEY = "theme";
const THEME_CHANGED_EVENT = "theme-changed";

function getResolvedTheme() {
  if (typeof window === "undefined") return "light";
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "dark" || storedTheme === "light") return storedTheme;
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

const Toaster = ({
  ...props
}) => {
  const [theme, setTheme] = useState(getResolvedTheme);

  useEffect(() => {
    const updateTheme = () => setTheme(getResolvedTheme());
    updateTheme();

    window.addEventListener("storage", updateTheme);
    window.addEventListener(THEME_CHANGED_EVENT, updateTheme);

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      window.removeEventListener("storage", updateTheme);
      window.removeEventListener(THEME_CHANGED_EVENT, updateTheme);
      observer.disconnect();
    };
  }, []);

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          colorScheme: theme
        }
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props} />
  );
}

export { Toaster }
