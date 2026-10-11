"use client";

import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HintProps {
  /** The text shown on hover and keyboard focus. */
  label: string;
  /**
   * Set when the wrapped button is disabled. Disabled buttons receive no pointer or focus events, so the hint listens on
   * the wrapper, which becomes focusable. The wrapper is the same element in both states, so a button that toggles
   * between disabled and enabled keeps its tooltip.
   */
  disabled?: boolean;
  side?: "top" | "bottom" | "left" | "right";
  /** Classes for the wrapper, so it hides at the same breakpoints as the button inside it. */
  wrapperClassName?: string;
  children: ReactNode;
}

/** Wraps an icon button with a hover/focus label. */
export function Hint({ label, disabled, side = "bottom", wrapperClassName, children }: HintProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={disabled ? 0 : undefined}
            className={cn("inline-flex rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50", wrapperClassName)}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
