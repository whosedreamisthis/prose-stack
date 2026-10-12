"use client";

import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { refreshResearch } from "@/actions/research";
import { UPLOAD_ENDPOINT, uploadKindOf, uploadProblem, type UploadKind } from "@/lib/research-config";
import { useLayoutStore } from "@/lib/stores/layout-store";
import { usePendingNavStore } from "@/lib/stores/pending-nav-store";
import { useResearchStore } from "@/lib/stores/research-store";
import { useTreeStore } from "@/lib/stores/tree-store";
import { uploadFiles } from "@/lib/uploadthing";

/** Opens the system file picker for one kind of upload and resolves with the chosen files (none if cancelled). */
function pickFiles(kind: UploadKind, multiple: boolean): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = multiple;
    input.accept = kind === "IMAGE" ? "image/jpeg,image/png,image/webp,image/gif" : ".pdf,.txt,.docx";
    // Attached while open: a detached input can be garbage collected before its change event fires. Invisible rather than
    // `display: none`, which some browsers (Safari) won't open a picker from.
    input.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none";
    input.tabIndex = -1;
    const done = (files: File[]) => {
      input.remove();
      resolve(files);
    };
    input.onchange = () => done([...(input.files ?? [])]);
    input.oncancel = () => done([]);
    document.body.append(input);
    input.click();
  });
}

/**
 * Uploads research files to a folder (null: the top level). Each shows as a row with its progress; a refusal removes the row
 * and says why. The server adds the item when the file is stored, so the tree refreshes once the upload is done.
 */
export function useResearchUpload(projectId: string) {
  const router = useRouter();
  const onResearchPage = usePathname() === `/projects/${projectId}/research`;
  const setSectionOpen = useLayoutStore((s) => s.setSectionOpen);

  /** Uploads one file; resolves with the new item's id, or null when it failed. */
  const uploadOne = async (kind: UploadKind, file: File, folderId: string | null, select: boolean): Promise<string | null> => {
    const store = useResearchStore.getState();
    const id = crypto.randomUUID();
    store.addUpload({ id, folderId, kind, name: file.name, progress: 0, select });
    if (folderId) useTreeStore.getState().toggle(`research:${folderId}`, false);
    try {
      const [uploaded] = await uploadFiles(UPLOAD_ENDPOINT[kind], {
        files: [file],
        input: { projectId, folderId },
        onUploadProgress: ({ progress }) => useResearchStore.getState().setUploadProgress(id, progress),
      });
      await refreshResearch({ projectId });
      return uploaded?.serverData?.id ?? null;
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : `Could not upload ${file.name}.`);
      return null;
    } finally {
      useResearchStore.getState().removeUpload(id);
    }
  };

  /** Opens an uploaded item, which selects (highlights) its row in the sidebar as a new note's is. */
  const openUploaded = (itemId: string, folderId: string | null) => {
    if (folderId) useTreeStore.getState().toggle(`research:${folderId}`, false);
    const { setPending } = usePendingNavStore.getState();
    if (!onResearchPage) setPending("section", "research");
    setPending("item", itemId);
    router.push(`/projects/${projectId}/research?item=${itemId}`);
  };

  /** Uploads files of a known kind, or (dropped files) of whichever kind each is. Refuses what the server would, early. */
  const uploadAll = (files: File[], folderId: string | null, kind?: UploadKind) => {
    if (files.length === 0) return;
    setSectionOpen("research", true);
    // Refuse what the server would, before any bytes go up.
    const accepted = files.flatMap((file) => {
      const fileKind = kind ?? uploadKindOf(file);
      const problem = fileKind ? uploadProblem(fileKind, file) : `${file.name} can't be uploaded: research takes images (JPEG, PNG, WebP, GIF) and files (PDF, TXT, DOCX).`;
      if (!fileKind || problem) {
        toast.error(problem ?? "That file can't be uploaded.");
        return [];
      }
      return [{ file, fileKind }];
    });
    // The last one is the one that opens, so its row is the selected one from the start.
    const uploads = accepted.map(({ file, fileKind }, i) => uploadOne(fileKind, file, folderId, i === accepted.length - 1));
    // Once they are all in, open the last one that made it: its row shows selected, and the pane shows the file.
    void Promise.all(uploads).then((ids) => {
      const last = ids.findLast((id): id is string => !!id);
      if (last) openUploaded(last, folderId);
      else router.refresh();
    });
  };

  return {
    /** The "Upload image" and "Upload file" menu items. */
    async choose(kind: UploadKind, folderId: string | null) {
      uploadAll(await pickFiles(kind, true), folderId, kind);
    },
    /** Files dropped from the desktop. */
    drop(files: File[], folderId: string | null) {
      uploadAll(files, folderId);
    },
  };
}
