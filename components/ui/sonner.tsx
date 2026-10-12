"use client"

import { useResolvedTheme } from "@/hooks/useResolvedTheme"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// Sonner's per-type variables: success toasts are green, error toasts red, each with readable text in both themes.
const TYPE_COLORS = {
  light: {
    "--success-bg": "#ecfdf3",
    "--success-text": "#05603a",
    "--success-border": "#a6f4c5",
    "--error-bg": "#fef3f2",
    "--error-text": "#b42318",
    "--error-border": "#fecdca",
  },
  dark: {
    "--success-bg": "#052e1c",
    "--success-text": "#6ce9a6",
    "--success-border": "#0b5a36",
    "--error-bg": "#3a0d0a",
    "--error-text": "#fda29b",
    "--error-border": "#7a271a",
  },
} as const

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useResolvedTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      richColors
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
          ...TYPE_COLORS[theme === "dark" ? "dark" : "light"],
        } as unknown as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
