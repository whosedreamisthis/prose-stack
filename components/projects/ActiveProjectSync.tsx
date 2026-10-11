"use client";

import { useEffect } from "react";
import { markProjectOpened } from "@/actions/projects";
import { useProjectStore } from "@/lib/stores/project-store";

/** Mirrors the route's projectId into the store and records the project as last opened. */
export function ActiveProjectSync({ projectId }: { projectId: string }) {
  const setActiveProjectId = useProjectStore((s) => s.setActiveProjectId);

  useEffect(() => {
    setActiveProjectId(projectId);
    void markProjectOpened(projectId);
    return () => setActiveProjectId(null);
  }, [projectId, setActiveProjectId]);

  return null;
}
