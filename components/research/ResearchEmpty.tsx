"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderPlusIcon, ImageIcon, LinkIcon, NotebookTextIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { addStarterFolders, createResearchItem } from "@/actions/research";
import { Button } from "@/components/ui/button";
import { useResearchUpload } from "@/hooks/useResearchUpload";
import { STARTER_FOLDERS } from "@/lib/research-config";
import { useLayoutStore } from "@/lib/stores/layout-store";
import { cn } from "@/lib/utils";

/** The research page with no item open: add a note or link, and, for a project with no research yet, the starter folders. */
export function ResearchEmpty({ projectId, hasResearch }: { projectId: string; hasResearch: boolean }) {
  const router = useRouter();
  const setSectionOpen = useLayoutStore((s) => s.setSectionOpen);
  const [pending, startTransition] = useTransition();
  const [fileOver, setFileOver] = useState(false);
  const upload = useResearchUpload(projectId);

  const add = (type: "NOTE" | "LINK") =>
    startTransition(async () => {
      const result = await createResearchItem({
        projectId,
        folderId: null,
        type,
      });
      if (!result.success) return void toast.error(result.error);
      setSectionOpen("research", true);
      router.push(`/projects/${projectId}/research?item=${result.data.id}`);
    });

  const starters = () =>
    startTransition(async () => {
      const result = await addStarterFolders({ projectId });
      if (!result.success) return void toast.error(result.error);
      setSectionOpen("research", true);
      toast.success("Starter folders added.");
    });

  return (
    <div
      className={cn(
        "mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border-2 border-transparent p-4 pt-16 text-center",
        fileOver && "border-dashed border-primary bg-primary/5",
      )}
      // Files dragged in from the desktop upload to the top level.
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setFileOver(true);
      }}
      onDragLeave={() => setFileOver(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setFileOver(false);
        upload.drop([...e.dataTransfer.files], null);
      }}
    >
      <h1 className="text-xl font-semibold">{hasResearch ? "Pick something to read" : "No research yet"}</h1>
      <p className="text-sm text-muted-foreground">
        {hasResearch
          ? "Open an item from the Research section of the sidebar, add a new one, or drop images and files here."
          : "Collect notes, links, images and files for your story, in folders. Worldbuilding fits here too."}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button disabled={pending} onClick={() => add("NOTE")}>
          <NotebookTextIcon /> Add note
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => add("LINK")}>
          <LinkIcon /> Add link
        </Button>
        <Button variant="outline" onClick={() => void upload.choose("IMAGE", null)}>
          <ImageIcon /> Upload image
        </Button>
        <Button variant="outline" onClick={() => void upload.choose("FILE", null)}>
          <UploadIcon /> Upload file
        </Button>
        {!hasResearch && (
          <Button variant="outline" disabled={pending} onClick={starters} title={STARTER_FOLDERS.join(", ")}>
            <FolderPlusIcon /> Add starter folders
          </Button>
        )}
      </div>
    </div>
  );
}
