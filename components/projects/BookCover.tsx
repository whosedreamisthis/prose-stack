import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { getContrastColor } from "@/lib/project-config";

interface BookCoverProps {
  design: string;
  color: string;
  title: string;
  subtitle?: string | null;
  author: string;
  imageUrl?: string | null;
  className?: string;
}

export function BookCover({ design, color, title, subtitle, author, imageUrl, className }: BookCoverProps) {
  const cssVars = {
    "--cover-bg": color,
    "--cover-fg": getContrastColor(color),
  } as CSSProperties;

  return (
    <div
      style={cssVars}
      className={cn(
        "relative flex aspect-[2/3] w-full flex-col overflow-hidden rounded-md bg-(--cover-bg) text-(--cover-fg) shadow-md",
        design === "classic" && "items-center justify-center p-5 text-center ring-4 ring-inset ring-(--cover-fg)/40",
        design === "modern" && "justify-end border-l-[18px] border-(--cover-fg)/30 p-4",
        design === "minimal" && "items-center justify-center p-5 text-center",
        design === "bold" && "justify-between p-4",
        className,
      )}
    >
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- uploaded covers come from an external host
        <img src={imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
      )}
      {!imageUrl && (
        <>
          <div className={cn(design === "bold" && "text-left")}>
            <p
              className={cn(
                "font-serif leading-tight break-words",
                design === "bold" ? "text-2xl font-black uppercase" : "text-lg font-semibold",
              )}
            >
              {title || "Untitled"}
            </p>
            {subtitle && <p className="mt-1 text-xs opacity-80">{subtitle}</p>}
          </div>
          <p className={cn("text-xs tracking-wide uppercase opacity-90", design !== "bold" && "mt-4")}>
            {author || "Author"}
          </p>
        </>
      )}
    </div>
  );
}
