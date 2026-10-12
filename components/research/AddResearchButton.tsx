"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderPlusIcon, ImageIcon, LinkIcon, MoreHorizontalIcon, NotebookTextIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { createResearchFolder, createResearchItem } from "@/actions/research";
import { Hint } from "@/components/layout/Hint";
import { useResearchUpload } from "@/hooks/useResearchUpload";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLayoutStore } from "@/lib/stores/layout-store";
import { usePendingNavStore } from "@/lib/stores/pending-nav-store";
import { useResearchStore } from "@/lib/stores/research-store";

/** The "…" in the Research section header: adds a note, a link or a folder at the top level. A new note or link opens. */
export function AddResearchButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const setPending = usePendingNavStore((s) => s.setPending);
  const setSectionOpen = useLayoutStore((s) => s.setSectionOpen);
  const setRenamingId = useResearchStore((s) => s.setRenamingId);
  const [pending, startTransition] = useTransition();
  const upload = useResearchUpload(projectId);

  const addItem = (type: "NOTE" | "LINK") =>
    startTransition(async () => {
      // A client id, so the new row is selected the moment it shows in the tree.
      const id = crypto.randomUUID();
      setPending("item", id);
      // It shows in the tree ready to be named.
      setRenamingId(id);
      const result = await createResearchItem({ projectId, folderId: null, type, id });
      if (!result.success) {
        setPending("item", null);
        setRenamingId(null);
        return void toast.error(result.error);
      }
      // The header menu works while the section is collapsed, so open it to show the new row.
      setSectionOpen("research", true);
      setPending("section", "research");
      router.push(`/projects/${projectId}/research?item=${result.data.id}`);
    });

  // The new folder opens in rename mode as soon as it shows in the tree, so it can be named at once.
  const addFolder = () =>
    startTransition(async () => {
      const id = crypto.randomUUID();
      setSectionOpen("research", true);
      setRenamingId(id);
      const result = await createResearchFolder({ projectId, parentId: null, id });
      if (!result.success) {
        setRenamingId(null);
        toast.error(result.error);
      }
    });

  return (
    <DropdownMenu>
      <Hint label="Add to research" side="right">
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" disabled={pending} aria-label="Add to research" />}>
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
      </Hint>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem onClick={() => addItem("NOTE")}>
          <NotebookTextIcon /> Add note
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => addItem("LINK")}>
          <LinkIcon /> Add link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={addFolder}>
          <FolderPlusIcon /> Add folder
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void upload.choose("IMAGE", null)}>
          <ImageIcon /> Upload image
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void upload.choose("FILE", null)}>
          <UploadIcon /> Upload file
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
