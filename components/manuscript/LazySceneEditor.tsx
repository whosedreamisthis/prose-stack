"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { SceneEditor } from "@/components/manuscript/SceneEditor";

type LazySceneEditorProps = Omit<ComponentProps<typeof SceneEditor>, "embedded"> & {
  /** Words the scene has now, to hold roughly the right height until its editor mounts. */
  wordCount: number;
  /** Mount at once instead of waiting to scroll near. */
  eager?: boolean;
};

/** A chapter or part page can hold many scenes; each one's editor mounts only when it is near the viewport, then stays. */
export function LazySceneEditor({ wordCount, eager = false, ...props }: LazySceneEditorProps) {
  const [near, setNear] = useState(eager);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (near || !el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setNear(true);
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);

  if (near) return <SceneEditor embedded {...props} />;
  return <div ref={ref} aria-hidden style={{ minHeight: Math.max(96, Math.ceil(wordCount / 10) * 28) }} />;
}
